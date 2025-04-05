flow :

/    Backend(express js) ->  python code parsing -> frontend (react js)   /



backend running process :

/      open new terminal
       type:  cd backend                               #redirects to backend folder located in the project folder
              node server.js

    server will run in localserver host port 4000    /


python code running : 
          
/       open new terminal
        type:   cd python                               #redirects to python folder located in the project folder
                python3 telemetry_parser.py             #runs pythoncode named telemetry_parser.py

    this python code will parses the logfile and stores the data in the mongo db separately according to the subsystems      
    change the logfile name in the python code according to your file name         /


frontend running process :

/        open new terminal 
         type:  npm i                                    #installs the dependencies present in the package.json
                npm start                                #runs the webpage in your local host        /


hosting with same network connection:

/           cd build
            serve -l 3000         /

