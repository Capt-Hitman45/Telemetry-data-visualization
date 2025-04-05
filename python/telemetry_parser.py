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
LOG_FILE = "/home/xdlinx/log_file 3.txt"
MONGO_URI = "mongodb://localhost:27017"
DATABASE_NAME = "telemetry_db"
NOTIFICATION_URL = "http://localhost:4000/api/notify-update"
COLLECTION_MAPPING = {
    "eps": "eps_telemetry",
    "uhf": "uhf_telemetry",
    "obc": "obc_telemetry"
}

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class TelemetryProcessor:
    def __init__(self):
        self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        self.db = self.client[DATABASE_NAME]
        self.last_position = os.path.getsize(LOG_FILE) if os.path.exists(LOG_FILE) else 0
        self.configs = self.load_configs()
        self.ensure_indexes()
        self.current_section = None
        
    def ensure_indexes(self):
        """Create proper indexes with consistent field names"""
        for collection in COLLECTION_MAPPING.values():
            try:
                # Drop old index if exists
                if "telemetry_index" in self.db[collection].index_information():
                    self.db[collection].drop_index("telemetry_index")
                
                # Create new index with consistent field names
                self.db[collection].create_index(
                    [
                        ("tm_received_time", 1),
                        ("tm_id", 1),
                        ("parameter", 1)
                    ],
                    name="telemetry_index",
                    unique=True,
                    partialFilterExpression={
                        "tm_id": {"$exists": True, "$type": "number"},
                        "parameter": {"$exists": True, "$type": "string"}
                    }
                )
                logger.info(f"Created index for {collection}")
            except Exception as e:
                logger.error(f"Error creating index for {collection}: {e}")

    def load_configs(self):
        try:
            configs = {}
            for subsystem in COLLECTION_MAPPING.keys():
                with open(f'{subsystem}_config.json') as f:
                    configs[subsystem] = json.load(f)
                logger.info(f"Loaded config for {subsystem}")
            return configs
        except Exception as e:
            logger.error(f"Error loading configs: {e}")
            return None

    def clean_parameter_name(self, name):
        """Convert parameter names to consistent format"""
        name = name.lower().strip()
        name = re.sub(r'[^a-z0-9_]', '_', name)
        name = re.sub(r'_+', '_', name)
        return name.strip('_')

    def clean_value(self, value):
        """Clean and convert telemetry values to appropriate type"""
        value = str(value).strip()
        
        # Remove non-data prefixes/suffixes
        value = re.sub(r'^[=>]*\s*', '', value)
        value = re.sub(r'\s*[A-Za-z]+$', '', value)
        
        # Try to convert to number
        try:
            return float(value) if '.' in value else int(value)
        except (ValueError, TypeError):
            return value if value else None

    def parse_line(self, line, tm_id, tm_received_time):
        """Parse a single line of telemetry data with context awareness"""
        if not line or not tm_id:
            return None

        try:
            # Convert tm_received_time to proper timestamp (UNIX timestamp in seconds)
            try:
                if tm_received_time and str(tm_received_time).strip():
                    # Handle both string and numeric timestamps
                    tm_received_time = int(float(tm_received_time))
                else:
                    # If no timestamp provided, use current time
                    tm_received_time = int(time.time())
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid tm_received_time: {tm_received_time} - Error: {e}")
                tm_received_time = int(time.time())
                
            line = line.strip()
            
            # Skip metadata lines
            if any(x in line for x in ["Received TM Id:-", "TM Received Time:-", "TM Recv Local Date", "Encryption"]):
                return None

            # Update section context
            if "======" in line:
                self.current_section = re.sub(r'=+|\s+', '', line).lower()
                return None

            # Panel voltage & current (0 = [10.0] V [1.53] A)
            # Identify sections
            if "Conv MPPT reading" in line:
                self.current_section = "mppt"
            elif "Panel reading" in line:
                self.current_section = "panel"
            elif "O/P Conv Volt" in line:
                self.current_section = "output"

            # Panel and MPPT Converter Readings (Both Voltage & Current)
            if match := re.match(r"^(\d+)\s*=\s*\[([^\]]+)\]\s*V\s*\[([^\]]+)\]\s*A", line):
                index, voltage, current = match.groups()
                
                # Check if the current section is MPPT or Panel
                if self.current_section == "mppt":
                    return [
                        {
                            "tm_received_time": tm_received_time,
                            "tm_id": int(tm_id),
                            "parameter": f"mppt_conv_{index}_voltage",
                            "value": self.clean_value(voltage)
                        },
                        {
                            "tm_received_time": tm_received_time,
                            "tm_id": int(tm_id),
                            "parameter": f"mppt_conv_{index}_current",
                            "value": self.clean_value(current)
                        }
                    ]
                else:  # Otherwise, it's a panel reading
                    return [
                        {
                            "tm_received_time": tm_received_time,
                            "tm_id": int(tm_id),
                            "parameter": f"panel_{index}_voltage",
                            "value": self.clean_value(voltage)
                        },
                        {
                            "tm_received_time": tm_received_time,
                            "tm_id": int(tm_id),
                            "parameter": f"panel_{index}_current",
                            "value": self.clean_value(current)
                        }
                    ]

            # Converter voltages (MPPT or Output, when only Voltage is present)
            elif match := re.match(r"^(\d+)\s*=\s*\[([^\]]+)\]\s*V", line):
                index, voltage = match.groups()
                conv_type = "mppt" if self.current_section == "mppt" else "output"
                return {
                    "tm_received_time": tm_received_time,
                    "tm_id": int(tm_id),
                    "parameter": f"{conv_type}_conv_{index}_voltage",
                    "value": self.clean_value(voltage)
                }


            # Battery temperatures
            elif match := re.match(r".*Btry temp\s*\[(\d+)\]\s*=\s*\[?([\d.]+)\]?\s*degC", line, re.IGNORECASE):
                index, temp = match.groups()
                return {
                    "tm_received_time": tm_received_time,
                    "tm_id": int(tm_id),
                    "parameter": f"btry_temp_{index}",
                    "value": self.clean_value(temp)
                }

            # Port statuses
            elif match := re.match(r"CHNL\[(.+?)\]\s*=>\s*PORT\[(\d+)\]=(\w+)", line):
                channel, port, status = match.groups()
                return {
                    "tm_received_time": tm_received_time,
                    "tm_id": int(tm_id),
                    "parameter": f"{self.clean_parameter_name(channel)}_port_{port}_status",
                    "value": status.strip()
                }

            # Total battery reading
            elif "Totl Btry reading" in line:
                if match := re.search(r"\[([\d.]+)\]\s*V\s*\[([\d.]+)\]\s*A", line):
                    voltage, current = match.groups()
                    return [
                        {
                            "tm_received_time": tm_received_time,
                            "tm_id": int(tm_id),
                            "parameter": "total_battery_voltage",
                            "value": self.clean_value(voltage)
                        },
                        {
                            "tm_received_time": tm_received_time,
                            "tm_id": int(tm_id),
                            "parameter": "total_battery_current",
                            "value": self.clean_value(current)
                        }
                    ]

            # Generic parameter = value
            elif "=" in line:
                parts = [p.strip() for p in line.split("=", 1)]
                if len(parts) == 2:
                    param = self.clean_parameter_name(parts[0])
                    value = self.clean_value(parts[1])
                    if value is not None:
                        return {
                            "tm_received_time": tm_received_time,
                            "tm_id": int(tm_id),
                            "parameter": param,
                            "value": value
                        }

            return None

        except Exception as e:
            logger.error(f"Error parsing line '{line}': {e}")
            return None

    def process_file(self):
        """Process the log file and update MongoDB with new data"""
        try:
            if not os.path.exists(LOG_FILE):
                logger.warning(f"Log file not found: {LOG_FILE}")
                return False

            with open(LOG_FILE, 'r') as f:
                current_size = os.path.getsize(LOG_FILE)
                if current_size < self.last_position:
                    logger.info("Log file truncated, resetting position")
                    self.last_position = 0
                
                f.seek(self.last_position)
                new_data = f.read()
                
                if not new_data:
                    return False
                
                logger.info(f"Processing {len(new_data.splitlines())} new lines")
                
                tm_id = None
                tm_received_time = None
                batch = []
                self.current_section = None
                
                for line in new_data.splitlines():
                    line = line.strip()
                    if not line:
                        continue
                    
                    # Extract TM metadata
                    if "Received TM Id:-" in line:
                        if match := re.search(r"Received TM Id:-\s*(\d+)", line):
                            tm_id = int(match.group(1))
                    elif "TM Received Time:-" in line:
                        if match := re.search(r"TM Received Time:-\s*(\d+)", line):
                            tm_received_time = match.group(1)
                    
                    # Parse telemetry data
                    elif tm_id is not None and tm_received_time is not None:
                        parsed = self.parse_line(line, tm_id, tm_received_time)
                        if parsed:
                            if isinstance(parsed, list):
                                batch.extend([p for p in parsed if p is not None])
                            elif parsed is not None:
                                batch.append(parsed)
                
                self.last_position = f.tell()
                
                if batch:
                    categorized = self.categorize_data(batch)
                    self.save_to_mongodb(categorized)
                    return True
                return False
                
        except Exception as e:
            logger.error(f"File processing error: {e}")
            return False

    def categorize_data(self, readings):
        """Categorize readings by subsystem based on tm_id ranges"""
        categorized = {k: [] for k in COLLECTION_MAPPING.keys()}
        for item in readings:
            if item is None:
                continue
            if 200 <= item['tm_id'] <= 300:
                categorized["eps"].append(item)
            elif 500 <= item['tm_id'] <= 650:
                categorized["obc"].append(item)
            elif 800 <= item['tm_id'] <= 900:
                categorized["uhf"].append(item)
        return categorized

    def save_to_mongodb(self, data):
        """Save categorized data to MongoDB collections"""
        try:
            for category, items in data.items():
                if not items:
                    continue
                    
                collection = self.db[COLLECTION_MAPPING[category]]
                operations = []
                
                for item in items:
                    if item is None:
                        continue
                        
                    operations.append(
                        UpdateOne(
                            {
                                "tm_received_time": item["tm_received_time"],
                                "tm_id": item["tm_id"],
                                "parameter": item["parameter"]
                            },
                            {"$set": item},
                            upsert=True
                        )
                    )
                
                if operations:
                    try:
                        result = collection.bulk_write(operations)
                        logger.info(f"{category.upper()}: Inserted {result.upserted_count}, Modified {result.modified_count}")
                        self.notify_backend(COLLECTION_MAPPING[category], items)
                    except Exception as e:
                        logger.error(f"Bulk write error for {category}: {e}")
                        
        except Exception as e:
            logger.error(f"MongoDB error: {e}")

    def notify_backend(self, collection, items):
        """Notify the backend about new data updates"""
        try:
            valid_items = [item for item in items if item is not None]
            if not valid_items:
                return
                
            response = requests.post(
                "http://localhost:4000/api/notify-update",
                json={
                    "collection": collection,
                    "data": valid_items
                },
                timeout=2
            )
            if response.status_code != 200:
                logger.warning(f"Notification failed: {response.status_code}")
        except Exception as e:
            logger.error(f"Could not send notification: {e}")

class TelemetryFileHandler(FileSystemEventHandler):
    def __init__(self, processor):
        self.processor = processor
    
    def on_modified(self, event):
        if event.src_path == LOG_FILE:
            self.processor.process_file()

def main():
    logger.info("\nTelemetry Processor - Real-Time Monitoring")
    processor = TelemetryProcessor()
    
    if not processor.configs:
        return
    
    logger.info("\nProcessing existing data...")
    processor.process_file()
    
    event_handler = TelemetryFileHandler(processor)
    observer = Observer()
    observer.schedule(event_handler, path=os.path.dirname(LOG_FILE))
    observer.start()
    
    try:
        logger.info("\nMonitoring for real-time changes...")
        while True:
            time.sleep(1)
            if os.path.getsize(LOG_FILE) > processor.last_position:
                processor.process_file()
    except KeyboardInterrupt:
        observer.stop()
        logger.info("\nShutting down gracefully...")
    finally:
        observer.join()
        processor.client.close()

if __name__ == "__main__":
    main()