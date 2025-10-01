import json
import re
import time
import os
import requests
import logging
from pymongo import MongoClient, UpdateOne
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

# Configuration
LOG_FILE = "/home/xdlinx/Downloads/eps_2.0.6_dbg_btry_vlt_up/26_sep_charge_t1.log"
MONGO_URI = "mongodb://localhost:27017"
DATABASE_NAME = "telemetry_db"
NOTIFICATION_URL = "http://localhost:4000/api/notify-update"
COLLECTION_MAPPING = {
    "eps": "eps_telemetry",
    "uhf": "uhf_telemetry",
    "obc": "obc_telemetry"
}

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class TelemetryProcessor:
    def __init__(self):
        self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        self.db = self.client[DATABASE_NAME]
        self.last_position = os.path.getsize(LOG_FILE) if os.path.exists(LOG_FILE) else 0
        self.configs = self._load_configs()
        self._ensure_indexes()
        self.current_section = None
        self.current_tm_id = None
        self.memory_patterns = {
            r"TOTAL:\s*([\d,]+)\s*bytes": {
                "eram": "total_eram_memory_bytes",
                "eflash": "total_eflash_qspi_memory_bytes",
                "flash": "total_flash_fmc_memory_bytes"
            },
            r"USED\s*:\s*([\d,]+)\s*bytes": {
                "eram": "used_eram_memory_bytes",
                "eflash": "used_eflash_qspi_memory_bytes",
                "flash": "used_flash_fmc_memory_bytes"
            },
            r"TOTAL\s*:\s*([\d,]+)\s*bytes": {
                "iram": "total_iram_heap_memory_bytes",
                "eram": "total_eram_heap_memory_bytes"
            },
            r"REMAINING\s*:\s*([\d,]+)\s*bytes": {
                "iram": "remaining_iram_heap_memory_bytes",
                "eram": "remaining_eram_heap_memory_bytes"
            }
        }

    def _load_configs(self):
        try:
            configs = {}
            for subsystem in COLLECTION_MAPPING:
                try:
                    with open(f'{subsystem}_config.json') as f:
                        subsystem_config = json.load(f)
                        normalized_config = {}
                        for tm_id, params in subsystem_config.items():
                            normalized_config[tm_id] = [p.lower().strip() for p in params]
                        configs[subsystem] = normalized_config
                except FileNotFoundError:
                    logger.warning(f"Config file not found for {subsystem}")
                    configs[subsystem] = {}
            return configs
        except Exception as e:
            logger.error(f"Error loading configs: {e}")
            return None

    def _ensure_indexes(self):
        for collection in COLLECTION_MAPPING.values():
            try:
                if "telemetry_index" in self.db[collection].index_information():
                    self.db[collection].drop_index("telemetry_index")
                
                self.db[collection].create_index(
                    [("tm_received_time", 1), ("tm_id", 1), ("parameter", 1)],
                    name="telemetry_index", unique=True,
                    partialFilterExpression={
                        "tm_id": {"$exists": True, "$type": "number"},
                        "parameter": {"$exists": True, "$type": "string"}
                    }
                )
                logger.info(f"Created/recreated index for {collection}")
            except Exception as e:
                logger.error(f"Index error for {collection}: {e}")

    def _update_section_context(self, line):
        if "ERAM MEMORY" in line:
            self.current_section = "eram"
        elif "EFLASH QSPI MEMORY" in line:
            self.current_section = "eflash"
        elif "FLASH FMC MEMORY" in line:
            self.current_section = "flash"
        elif "IRAM HEAP MEMORY" in line:
            self.current_section = "iram"
        elif "ERAM HEAP MEMORY" in line:
            self.current_section = "eram"
        elif "Conv MPPT reading" in line:
            self.current_section = "mppt"
        elif "Panel reading" in line:
            self.current_section = "panel"
        elif "O/P Conv Volt" in line:
            self.current_section = "output"

    def clean_parameter_name(self, name):
        return re.sub(r'_+', '_', re.sub(r'[^a-z0-9_]', '_', name.lower().strip())).strip('_')

    def clean_value(self, value):
        value = re.sub(r'^[=>]*\s*|\s*[A-Za-z]+$', '', str(value).strip())
        try:
            return float(value) if '.' in value else int(value)
        except (ValueError, TypeError):
            return value if value else None

    def _parse_memory_data(self, line, tm_id, tm_received_time, local_date_time):
        for pattern, param_map in self.memory_patterns.items():
            if match := re.match(pattern, line):
                for section, param in param_map.items():
                    if self.current_section == section:
                        if str(tm_id).startswith('5'):
                            param = param.replace('_memory_bytes', '')
                        return {
                            "tm_received_time": tm_received_time,
                            "tm_id": int(tm_id),
                            "parameter": param,
                            "value": self.clean_value(match.group(1).replace(',', '')),
                            "processed_at": int(time.time()),
                            "local_date_time": local_date_time  # Add local date time
                        }
        return None

    def _parse_uhf_telemetry(self, line, tm_id, tm_received_time, local_date_time):
        try:
            str_tm_id = str(tm_id)
            if str_tm_id not in self.configs.get("uhf", {}):
                return None
                
            allowed_params = [p.lower().strip() for p in self.configs["uhf"][str_tm_id]]
            
            if ":" in line:
                param, value = [x.strip() for x in line.split(":", 1)]
                clean_param = self.clean_parameter_name(param)
                if param.lower() in allowed_params or clean_param in allowed_params:
                    return {
                        "tm_received_time": tm_received_time,
                        "tm_id": int(tm_id),
                        "parameter": clean_param,
                        "value": self.clean_value(value),
                        "processed_at": int(time.time()),
                        "local_date_time": local_date_time  # Add local date time
                    }
                    
            elif "=" in line:
                param, value = [x.strip() for x in line.split("=", 1)]
                clean_param = self.clean_parameter_name(param)
                if param.lower() in allowed_params or clean_param in allowed_params:
                    return {
                        "tm_received_time": tm_received_time,
                        "tm_id": int(tm_id),
                        "parameter": clean_param,
                        "value": self.clean_value(value),
                        "processed_at": int(time.time()),
                        "local_date_time": local_date_time  # Add local date time
                    }
                
            elif "=>" in line:
                param, value = [x.strip() for x in line.split("=>", 1)]
                clean_param = self.clean_parameter_name(param)
                if param.lower() in allowed_params or clean_param in allowed_params:
                    return {
                        "tm_received_time": tm_received_time,
                        "tm_id": int(tm_id),
                        "parameter": clean_param,
                        "value": self.clean_value(value),
                        "processed_at": int(time.time()),
                        "local_date_time": local_date_time  # Add local date time
                    }
                    
            elif line.startswith("adc:"):
                if "adc" in allowed_params:
                    return {
                        "tm_received_time": tm_received_time,
                        "tm_id": int(tm_id),
                        "parameter": "adc",
                        "value": self.clean_value(line.split(":")[1]),
                        "processed_at": int(time.time()),
                        "local_date_time": local_date_time  # Add local date time
                    }
                    
            elif "UHF RSSI value in dBm is" in line:
                if "rssi" in allowed_params:
                    return {
                        "tm_received_time": tm_received_time,
                        "tm_id": int(tm_id),
                        "parameter": "rssi_value_dbm",
                        "value": self.clean_value(line.split()[-1]),
                        "processed_at": int(time.time()),
                        "local_date_time": local_date_time  # Add local date time
                    }
                    
        except Exception as e:
            logger.error(f"Error parsing UHF line '{line}': {e}")
        return None

    def _parse_telemetry_line(self, line, tm_id, tm_received_time, local_date_time):
        if str(tm_id).startswith('8'):
            return self._parse_uhf_telemetry(line, tm_id, tm_received_time, local_date_time)
            
        if match := re.match(r"^(\d+)\s*=\s*\[([^\]]+)\]\s*V\s*\[([^\]]+)\]\s*A", line):
            index, voltage, current = match.groups()
            prefix = "mppt" if self.current_section == "mppt" else "panel"
            return [
                {"tm_received_time": tm_received_time, "tm_id": int(tm_id),
                 "parameter": f"{prefix}_conv_{index}_voltage", "value": self.clean_value(voltage),
                 "processed_at": int(time.time()), "local_date_time": local_date_time},
                {"tm_received_time": tm_received_time, "tm_id": int(tm_id),
                 "parameter": f"{prefix}_conv_{index}_current", "value": self.clean_value(current),
                 "processed_at": int(time.time()), "local_date_time": local_date_time}
            ]
        elif match := re.match(r"^(\d+)\s*=\s*\[([^\]]+)\]\s*V", line):
            index, voltage = match.groups()
            conv_type = "mppt" if self.current_section == "mppt" else "output"
            return {"tm_received_time": tm_received_time, "tm_id": int(tm_id),
                    "parameter": f"{conv_type}_conv_{index}_voltage", "value": self.clean_value(voltage),
                    "processed_at": int(time.time()), "local_date_time": local_date_time}
        elif match := re.match(r".*Btry temp\s*\[(\d+)\]\s*=\s*\[?([\d.]+)\]?\s*degC", line, re.IGNORECASE):
            index, temp = match.groups()
            return {"tm_received_time": tm_received_time, "tm_id": int(tm_id),
                    "parameter": f"btry_temp_{index}", "value": self.clean_value(temp),
                    "processed_at": int(time.time()), "local_date_time": local_date_time}
        elif match := re.match(r"CHNL\[(.+?)\]\s*=>\s*PORT\[(\d+)\]=(\w+)", line):
            channel, port, status = match.groups()
            return {"tm_received_time": tm_received_time, "tm_id": int(tm_id),
                    "parameter": f"{self.clean_parameter_name(channel)}_port_{port}_status", "value": status.strip(),
                    "processed_at": int(time.time()), "local_date_time": local_date_time}
        elif "Totl Btry reading" in line and (match := re.search(r"\[\s*(-?[\d.]+)\s*\]\s*V\s*\[\s*(-?[\d.]+)\s*\]\s*A", line)):
            return [
                {"tm_received_time": tm_received_time, "tm_id": int(tm_id),
                 "parameter": "total_battery_voltage", "value": self.clean_value(match.group(1)),
                 "processed_at": int(time.time()), "local_date_time": local_date_time},
                {"tm_received_time": tm_received_time, "tm_id": int(tm_id),
                 "parameter": "total_battery_current", "value": self.clean_value(match.group(2)),
                 "processed_at": int(time.time()), "local_date_time": local_date_time}
            ]
        elif "=" in line:
            parts = [p.strip() for p in line.split("=", 1)]
            if len(parts) == 2 and (value := self.clean_value(parts[1])) is not None:
                return {"tm_received_time": tm_received_time, "tm_id": int(tm_id),
                        "parameter": self.clean_parameter_name(parts[0]), "value": value,
                        "processed_at": int(time.time()), "local_date_time": local_date_time}
        return None

    def parse_line(self, line, tm_id, tm_received_time, local_date_time=None):
        if not line or not tm_id:
            return None
            
        try:
            start_time = time.time()
            tm_received_time = int(float(tm_received_time)) if tm_received_time and str(tm_received_time).strip() else int(time.time())
            line = line.strip()
            
            if any(x in line for x in ["Received TM Id:-", "TM Received Time:-", "TM Recv Local Date", "Encryption"]):
                return None

            if "======" in line:
                self.current_section = re.sub(r'=+|\s+', '', line).lower()
                return None
            
            if any(s in line for s in ["ERAM MEMORY", "EFLASH QSPI MEMORY", "FLASH FMC MEMORY", 
                                     "IRAM HEAP MEMORY", "ERAM HEAP MEMORY", "Conv MPPT reading", 
                                     "Panel reading", "O/P Conv Volt"]):
                self._update_section_context(line)
                return None

            if "TM Recv Local Date and Time:-" in line and (match := re.search(r"TM Recv Local Date and Time:-\s*(\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2})", line)):
                local_date_time = match.group(1)
                return None  # Skip, just update local_date_time

            if memory_data := self._parse_memory_data(line, tm_id, tm_received_time, local_date_time):
                logger.debug(f"Parsed memory data in {time.time() - start_time:.3f}s: {memory_data}")
                return memory_data
                
            parsed = self._parse_telemetry_line(line, tm_id, tm_received_time, local_date_time)
            logger.debug(f"Parsed telemetry in {time.time() - start_time:.3f}s: {parsed}")
            return parsed
            
        except Exception as e:
            logger.error(f"Error parsing line '{line}': {e}")
            return None

    def _notify_backend(self, collection, items):
        try:
            start_time = time.time()
            response = requests.post(NOTIFICATION_URL, json={"collection": collection, "data": items}, timeout=2)
            if response.status_code != 200:
                logger.warning(f"Notification failed for {collection}: Status {response.status_code}")
            else:
                logger.debug(f"Notified backend for {collection} in {time.time() - start_time:.3f}s")
        except Exception as e:
            logger.error(f"Could not send notification for {collection}: {e}")

    def process_file(self):
        try:
            if not os.path.exists(LOG_FILE):
                logger.warning(f"Log file not found: {LOG_FILE}")
                return False

            with open(LOG_FILE, 'r') as f:
                start_time = time.time()
                current_size = os.path.getsize(LOG_FILE)
                if current_size < self.last_position:
                    logger.info("Log file truncated, resetting position")
                    self.last_position = 0
                elif current_size == self.last_position:
                    return False
                
                f.seek(self.last_position)
                data = f.read()
                if not data:
                    return False
                    
                logger.info(f"Processing {len(data.splitlines())} new lines")
                
                tm_id = tm_received_time = local_date_time = None
                batch = []
                
                for line in data.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    
                    if "Received TM Id:-" in line and (match := re.search(r"Received TM Id:-\s*(\d+)", line)):
                        tm_id = int(match.group(1))
                        logger.debug(f"Found TM ID: {tm_id}")
                    elif "TM Received Time:-" in line and (match := re.search(r"TM Received Time:-\s*(\d+)", line)):
                        tm_received_time = match.group(1)
                        logger.debug(f"Found TM Time: {tm_received_time}")
                    elif "TM Recv Local Date and Time:-" in line and (match := re.search(r"TM Recv Local Date and Time:-\s*(\d{4}-\d{1,2}-\d{1,2}\s+\d{1,2}:\d{1,2}:\d{1,2})", line)):
                        local_date_time = match.group(1)
                        logger.debug(f"Found Local Date Time: {local_date_time}")
                    elif tm_id and (parsed := self.parse_line(line, tm_id, tm_received_time, local_date_time)):
                        if isinstance(parsed, list):
                            batch.extend(parsed)
                        else:
                            batch.append(parsed)
                        logger.debug(f"Parsed line: {line}")
                
                self.last_position = f.tell()
                
                if batch:
                    logger.info(f"Processing batch of {len(batch)} items")
                    categorized = {k: [] for k in COLLECTION_MAPPING}
                    
                    for item in batch:
                        tm_id = item['tm_id']
                        if 200 <= tm_id <= 300:
                            categorized["eps"].append(item)
                        elif 500 <= tm_id <= 650:
                            categorized["obc"].append(item)
                        elif 800 <= tm_id <= 900:
                            categorized["uhf"].append(item)
                        else:
                            logger.warning(f"Unknown TM ID range for ID {tm_id}")
                    
                    for category, items in categorized.items():
                        if items:
                            try:
                                logger.info(f"Processing {len(items)} items for {category}")
                                collection = COLLECTION_MAPPING[category]
                                
                                if self.configs and category in self.configs:
                                    valid_tm_ids = self.configs[category].keys()
                                    items = [i for i in items if str(i['tm_id']) in valid_tm_ids]
                                
                                if items:
                                    batch_start = time.time()
                                    for i in range(0, len(items), 100):  # Limit batch size
                                        batch_items = items[i:i+100]
                                        result = self.db[collection].bulk_write(
                                            [UpdateOne(
                                                {"tm_received_time": item["tm_received_time"], 
                                                 "tm_id": item["tm_id"], 
                                                 "parameter": item["parameter"]},
                                                {"$set": item}, upsert=True) for item in batch_items],
                                            ordered=False
                                        )
                                        logger.info(f"{category.upper()}: Inserted {result.upserted_count}, Modified {result.modified_count} in {time.time() - batch_start:.3f}s")
                                    self._notify_backend(collection, items)
                            except Exception as e:
                                logger.error(f"Bulk write error for {category}: {e}")
                    logger.info(f"Total processing time: {time.time() - start_time:.3f}s")
                    return True
                return False
        except Exception as e:
            logger.error(f"File processing error: {e}")
            return False

class TelemetryFileHandler(FileSystemEventHandler):
    def __init__(self, processor):
        self.processor = processor
    
    def on_modified(self, event):
        if event.src_path == LOG_FILE:
            self.processor.process_file()

def main():
    logger.info("Telemetry Processor - Real-Time Monitoring")
    processor = TelemetryProcessor()
    
    if processor.configs:
        processor.process_file()
        observer = Observer()
        observer.schedule(TelemetryFileHandler(processor), path=os.path.dirname(LOG_FILE))
        observer.start()
        
        try:
            while True:
                time.sleep(0.1)  # Reduced polling interval
                if os.path.getsize(LOG_FILE) > processor.last_position:
                    processor.process_file()
        except KeyboardInterrupt:
            observer.stop()
        observer.join()
        processor.client.close()

if __name__ == "__main__":
    main()
