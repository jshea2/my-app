const { app, BrowserWindow, ipcRenderer, ipcMain } = require('electron');
const path = require('path');
//const os = require('os-utils')
const OBSWebSocket = require('obs-websocket-js');
const { Client, Server } = require('node-osc');
const obs = new OBSWebSocket();


// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}
let logging
const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 270,
    height: 880,
    webPreferences: {
      nodeIntegration: true 
    }
  });

  mainWindow.on('closed', function(){
    app.quit()
})

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

ipcMain.on("submitted", (event, data) => {
    // Open the DevTools.
    mainWindow.setSize(600,880)
  mainWindow.webContents.openDevTools();
})

  ipcMain.on("obsip", (event, data) => {
    obsIp = data
    console.log(data)
  })

  ipcMain.on("obsport", (event, data) => {
    obsPort = data
    console.log(data)
  })

  ipcMain.on("obspassword", (event, data) => {
    obsPassword = data
    console.log(data)
  })

  ipcMain.on("oscinip", (event, data) => {
    oscServerIp = data
    console.log(data)
  })

  ipcMain.on("oscinport", (event, data) => {
    oscPortIn = data
    console.log(data)
  })

  ipcMain.on("enableoscout", (event, data) => {
    enableObs2App = data
    console.log(data)
  })

  ipcMain.on("oscoutip", (event, data) => {
    oscClientIp = data
    console.log(data)
  })

  ipcMain.on("oscoutport", (event, data) => {
    oscPortOut = data
    console.log(data)
  })

  ipcMain.on("oscoutprepend", (event, data) => {
    oscOutPrefix = data
    console.log(data)
  })

  ipcMain.on("oscoutpostpend", (event, data) => {
    oscOutSuffix = data
    console.log(data)
  })

  function logEverywhere(message) {
    if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.executeJavaScript(`console.log(\`${message}\`)`);
    }
    }

  setInterval(() => {
    if(logging !== undefined){
      mainWindow.webContents.send("Logging", logging)
      logging = undefined
    }
  }, 500);

//   setInterval(() => {
//     os.cpuUsage(function(v){
//       console.log('cpu usage (%): ' + v*100)
//       mainWindow.webContents.send('cpu',v*100)
//     })
//   }, 1000);


//NODE-OBSosc
//by Joe Shea

//INPUT YOUR STUFF HERE:
//OBS Config
let obsIp = "127.0.0.1"
let obsPort = 4444;
let obsPassword = "secret"
//OSC Server (IN) Config
let oscServerIp = "127.0.0.1";
let oscPortIn = 3333;
//Enable OBS -> App Control
let enableObs2App = false
//OSC Client (OUT) Config
let oscClientIp = "127.0.0.1";
let oscPortOut = 53000;
let oscOutPrefix = "/cue/"
let oscOutSuffix = "/start"



//Connect to OBS
ipcMain.on("obsConnect", (event, data) => {
obs.connect({
        address: obsIp + ':'+ obsPort,
        password: obsPassword
    })
    .then(() => {
        logging = `\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`;
        console.log(logging)
        logEverywhere(`\nConnected & authenticated to OBS Websockets...\nIP: ${obsIp}\nPort: ${obsPort}`)
        return obs.send('GetSceneList');                                    //Send a Get Scene List Promise
    })
    .then(data => {
        console.log(`\n${data.scenes.length} Available Scenes.` + "\n");    //Log Total Scenes
        logEverywhere(`\n${data.scenes.length} Available Scenes.` + "\n")
        console.log(data.scenes.forEach((thing, index) => {
            console.log((index + 1) + " - " + thing.name);
            logEverywhere((index + 1) + " - " + thing.name)                 //Log List of Available Scenes with OSC Index
        }));

        console.log('-- Use "/scene [index]" For OSC Control --\n\n');      //Log OSC Scene Syntax
        logEverywhere('-- Use "/scene [index]" For OSC Control --\n\n')
    })
    .catch(err => {
        console.log(err);
        logEverywhere(err)                                                 //Log Catch Errors
        console.log("-!- Make Sure OBS is Running and Websocket IP/Port/Password are Correct -!-");
        logEverywhere("-!- Make Sure OBS is Running and Websocket IP/Port/Password are Correct -!-")
    });

//Listen and Log When New Scene is Activated
obs.on('SwitchScenes', data => {
    console.log(`New Active Scene: ${data.sceneName}`);
    logEverywhere(`New Active Scene: ${data.sceneName}`)
});



// Handler to Avoid Uncaught Exceptions.
obs.on('error', err => {
    console.error('socket error:', err);
    logEverywhere(err)
});

//Connect to OSC
const client = new Client(oscClientIp, oscPortOut);
var server = new Server(oscPortIn, oscServerIp);

//OSC Server (IN)
server.on('listening', () => {
  console.log("\n\n" + 'OSC Server is listening on...\n IP: ' + oscServerIp + '\n Port: ' + oscPortIn);
  logEverywhere("\n\n" + 'OSC Server is listening on...\n IP: ' + oscServerIp + '\n Port: ' + oscPortIn)
  console.log('\nOSC Server is sending back on...\n IP: ' + oscClientIp + '\n Port: ' + oscPortOut);
  logEverywhere('\nOSC Server is sending back on...\n IP: ' + oscClientIp + '\n Port: ' + oscPortOut)
})

//OSC -> OBS
server.on('message', (msg) => {
    //Trigger Scene by Index Number
  if (msg[0] === "/scene" && typeof msg[1] === 'number'){ 
      console.log("number thing works")                                     //When OSC Recieves a /scene do...
      var oscMessage = msg[1] - 1;                                          //Convert Index Number to Start at 1
      var oscMessage = Math.floor(oscMessage);                              //Converts Any Float Argument to Lowest Integer
    return obs.send('GetSceneList').then(data => {                          //Request Scene List Array
        console.log(`OSC IN: ${msg[0]} ${oscMessage + 1} (${data.scenes[oscMessage].name})`)
        logEverywhere(`OSC IN: ${msg[0]} ${oscMessage + 1} (${data.scenes[oscMessage].name})`)
        obs.send("SetCurrentScene", {
            'scene-name': data.scenes[oscMessage].name                      //Set to Scene from OSC
            })
        }).catch(() => {
            console.log("Error: Out Of '/scene' Range"); 
            logEverywhere("Error: Out Of '/scene' Range")                   //Catch Error
        });
    } 

    //Trigger Scene if Argument is a String and Contains a Space
    else if (msg[0] === "/scene" && msg.length > 2){                      //When OSC Recieves a /scene do...                                       
        var firstIndex = msg.shift();                                       //Removes First Index from 'msg' and Stores it to Another Variable
        oscMultiArg = msg.join(' ')                                         //Converts 'msg' to a String with spaces
      return obs.send('GetSceneList').then(data => {                        //Request Scene List Array
          console.log(`OSC IN: ${firstIndex} ${oscMultiArg}`)
          logEverywhere(`OSC IN: ${firstIndex} ${oscMultiArg}`)
          obs.send("SetCurrentScene", {
              'scene-name': oscMultiArg                                     //Set to Scene from OSC
              }).catch(() => {
                console.log(`Error: There is no Scene "${oscMultiArg}" in OBS. Double check case sensitivity.`);
                logEverywhere(`Error: There is no Scene "${oscMultiArg}" in OBS. Double check case sensitivity.`);
              })
          }).catch((err) => {
              console.log(err) 
              logEverywhere(err)                                                           //Catch Error
          });
      } 
      
      //Trigger Scene if Argument is a String
      else if (msg[0] === "/scene" && typeof msg[1] === 'string'){          //When OSC Recieves a /scene do...
        var oscMessage = msg[1]; 
      return obs.send('GetSceneList').then(data => {                         //Request Scene List Array
          console.log(`OSC IN: ${msg[0]} ${oscMessage}`)
          logEverywhere(`OSC IN: ${msg[0]} ${oscMessage}`)
          obs.send("SetCurrentScene", {
              'scene-name': oscMessage                                       //Set to Scene from OSC
              }).catch(() => {
                console.log(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.`);
                logEverywhere(`Error: There is no Scene "${msg[1]}" in OBS. Double check case sensitivity.`);

              })
          }).catch((err) => {
              console.log(err) 
              logEverywhere(err)                                                           //Catch Error
          });
      } 

      //Trigger Scene if Scene Name is in the OSC String
      else if (msg[0].includes('/scene') && msg.length === 1){
        var msgArray = msg[0].split("/")
        msgArray.shift()
        msgArray.shift()
        obs.send("SetCurrentScene", {
            'scene-name': msgArray[0].split("_").join(" ").toString(),                                          //Set to Scene from OSC
            }).catch(() => {
              console.log(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);
              logEverywhere(`Error: There is no Scene "${msgArray}" in OBS. Double check case sensitivity.`);

            }).catch((err) => {
            console.log(err) 
            logEverywhere(err)                                               //Catch Error
        });

      }
      
      //Triggers to "GO" to the Next Scene
      else if (msg[0] === "/go"){                                          //When OSC Recieves a /go do...
            
        return obs.send('GetSceneList').then(data => {                      //Request Scene List Array
            
            var cleanArray = []
            var rawSceneList = data                                         //Assign Get Scene List 'data' to variable 
            data.scenes.forEach(element => {cleanArray.push(element.name)}); //Converting Scene List To a Cleaner(Less Nested) Array (Getting the Desired Nested Values) 
            return obs.send("GetCurrentScene").then(data => {               //Request Current Scene Name
                var currentSceneIndex = cleanArray.indexOf(data.name)       //Get the Index of the Current Scene Referenced from the Clean Array
                if (currentSceneIndex + 1 >= rawSceneList.scenes.length){   //When the Current Scene is More than the Total Scenes...
                obs.send("SetCurrentScene", {
                        'scene-name': rawSceneList.scenes[0].name           //Set the Scene to First Scene
                })
             } else {
                obs.send("SetCurrentScene", {
                    'scene-name': rawSceneList.scenes[currentSceneIndex + 1].name  //Set Scene to Next Scene (Referenced from the Current Scene and Array)
                    })   
                }
        }).catch(() => {
            console.log("Error: Invalid OSC Message");                              //Catch Error
            logEverywhere("Error: Invalid OSC Message");                              //Catch Error

            });
        })
    } 
    
    //Triggers Previous Scene to go "BACK"
    else if (msg[0] === "/back"){                                                 //Same Concept as Above Except Going to the Previous Scene

        return obs.send('GetSceneList').then(data => {
            
            var cleanArray = []
            var rawSceneList = data
            data.scenes.forEach(element => {cleanArray.push(element.name)});
            return obs.send("GetCurrentScene").then(data => {
                var currentSceneIndex = cleanArray.indexOf(data.name)
                if (currentSceneIndex - 1 <= -1){
                obs.send("SetCurrentScene", {
                        'scene-name': rawSceneList.scenes[rawSceneList.scenes.length - 1].name 
                })
             } else {
                obs.send("SetCurrentScene", {
                    'scene-name': rawSceneList.scenes[currentSceneIndex - 1].name
                    })   
                }
        }).catch(() => {
            console.log("Error: Invalid OSC Message");
            logEverywhere("Error: Invalid OSC Message")
            });
        })


    } 
    //Triggers Start Recording
    else if (msg[0] === "/startRecording"){
        obs.send("StartRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Stop Recording
    else if (msg[0] === "/stopRecording"){
        obs.send("StopRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Toggle Recording
    else if (msg[0] === "/toggleRecording"){
        obs.send("StartStopRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Start Streaming
    else if (msg[0] === "/startStreaming"){
        obs.send("StartStreaming").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Stop Streaming
    else if (msg[0] === "/stopStreaming"){
        obs.send("StopStreaming").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Toggle Streaming
    else if (msg[0] === "/toggleStreaming"){
        obs.send("StartStopStreaming").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Pause Recording
    else if (msg[0] === "/pauseRecording"){
        obs.send("PauseRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Resume Recording
    else if (msg[0] === "/resumeRecording"){
        obs.send("ResumeRecording").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Enable Studio Mode
    else if (msg[0] === "/enableStudioMode"){
        obs.send("EnableStudioMode").catch((err) => {
            console.log(`ERROR: ${err.error}`)
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Disable Studio Mode
    else if (msg[0] === "/disableStudioMode"){
        obs.send("DisableStudioMode").catch((err) => {
            console.log(`ERROR: ${err.error}`);
            logEverywhere(`ERROR: ${err.error}`)
        })
    
    } 
    //Triggers Toggle Studio Mode
    else if (msg[0] === "/toggleStudioMode"){
        obs.send("ToggleStudioMode").catch((err) => {
            console.log(err)
            logEverywhere(err)
        })
    
    } 
    //Triggers Source Visibility On/Off
    else if (msg[0].includes('visible')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var visible;
        if(msg[1] === 0 || msg[1] === 'off'){
            visible = false
        } else if(msg[1] === 1 || msg[1] === 'on'){
            visible = true
        }
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].split('_').join(' ').toString(),
            'item': msgArray[1].split('_').join(' ').toString(),
            'visible': visible,
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere("Error: Invalid Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")

        })
    } 

    //Triggers Filter Visibility On/Off
    else if (msg[0].includes('filterVisibility')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var visiblef;
        if(msg[1] === 0 || msg[1] === 'off'){
            visiblef = false
        } else if(msg[1] === 1 || msg[1] === 'on'){
            visiblef = true
        }
        obs.send("SetSourceFilterVisibility", {
            'sourceName': msgArray[0].split('_').join(' '),
            'filterName': msgArray[1].split('_').join(' '),
            'filterEnabled': visiblef
        }).catch(() => {
            console.log("Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere("Error: Invalid Syntax. Make Sure There Are NO SPACES in Source Name and Filter name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")

        })
    } 

    //Triggers the Source Opacity (via Filter > Color Correction)
    else if (msg[0].includes('opacity')){
        console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
        logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        obs.send("SetSourceFilterSettings", {
           'sourceName': msgArray[0].split('_').join(' '),
           'filterName': msgArray[1].split('_').join(' '),
           'filterSettings': {'opacity' : msg[1]*100}
        }).catch(() => {
            console.log("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")
            logEverywhere("ERROR: Opacity Command Syntax is Incorrect. Refer to Node OBSosc Github for Reference")

        })  
    }

    //Set Transition Type and Duration
    else if (msg[0] === '/transition'){
        if (msg[1] === "Cut" || msg[1] === "Stinger") {
            console.log(`OSC IN: ${msg[0]} ${msg[1]}`)
            logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}`)
            obs.send("SetCurrentTransition", {
                'transition-name': msg[1].toString()
            }).catch(() => {
                console.log("Whoops")
                logEverywhere("Whoops")
            })
        } else if(msg[1] === "Fade" || msg[1] === "Move" || msg[1] === "Luma_Wipe" || msg[1] === "Fade_to_Color" || msg[1] === "Slide" || msg[1] === "Swipe"){
            if (msg[2] === undefined){
                obs.send("GetTransitionDuration").then(data => {
                    var tranisionTime = data["transition-duration"]
                    console.log(`OSC IN: ${msg[0]} ${msg[1]}\nCurrent Duration: ${tranisionTime}`)
                    logEverywhere(`OSC IN: ${msg[0]} ${msg[1]}\nCurrent Duration: ${tranisionTime}`)
                })
            } else {
            console.log(`OSC IN: ${msg[0]} ${msg[1]} ${msg[2]}`)
            logEverywhere(`OSC IN: ${msg[0]} ${msg[1]} ${msg[2]}`)
            }
            var makeSpace = msg[1].split('_').join(' ');
        obs.send("SetCurrentTransition", {
            'transition-name': makeSpace.toString()
        })
        if(msg.length === 3){
        obs.send("SetTransitionDuration", {
            'duration': msg[2]
        })}
        } else {
            console.log("ERROR: Invalid Transition Name. It's Case Sensitive. Or if it contains SPACES use '_' instead")
            logEverywhere("ERROR: Invalid Transition Name. It's Case Sensitive. Or if it contains SPACES use '_' instead")
        } 
        
    } 
    
    //Source Position Translate
    else if (msg[0].includes('position')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = msg[1] + 960
        var y = msg[2] - (msg[2] * 2)
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].toString().split('_').join(' '),
            'item': msgArray[1].toString().split('_').join(' '),
            'position': { 'x': x, 'y': y + 540}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalis Position Syntax")
        })
    }

    //Source Scale Translate
    else if (msg[0].includes('scale')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var visible;
        obs.send("SetSceneItemProperties", {
            'scene-name': msgArray[0].split('_').join(' ').toString(),
            'item': msgArray[1].split('_').join(' ').toString(),
            'scale': { 'x': msg[1], 'y': msg[1]}
        }).catch(() => {
            console.log("Error: Invalid Scale Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
            logEverywhere("Error: Invalid Scale Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/visible 0 or 1, example: /Wide/VOX/visible 1")
        })
    } 

        //Source Rotation Translate
        else if (msg[0].includes('rotate')){
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            var msgArray = msg[0].split("/")
            msgArray.shift()
            obs.send("SetSceneItemProperties", {
                'scene-name': msgArray[0].split('_').join(' ').toString(),
                'item': msgArray[1].split('_').join(' ').toString(),
                'rotation': msg[1]
            }).catch(() => {
                console.log("Error: Invalid Rotation Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/rotate 0 or 1, example: /Wide/VOX/rotate 1")
                logEverywhere("Error: Invalid Rotation Syntax. Make Sure There Are NO SPACES in Scene Name and Source Name. /[Scene Name]/[Source Name]/rotate 0 or 1, example: /Wide/VOX/rotate 1")
            })
        } 

    // ----- TouchOSC COMMANDS: ------

    //Source Position Select Move
    else if (msg[0] === '/move'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        var x = Math.floor((msg[2]*2000))
        var y = Math.floor((msg[1]*2000) + 960)
        console.log(x + " " + y)
        logEverywhere(x + " " + y)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name,
            'item': currentSceneItem,
            'position': { 'x': x + 540, 'y': y, 'alignment': 0}
        }).catch(() => {
            console.log("ERROR: Invalis Position Syntax")
            logEverywhere("ERROR: Invalis Position Syntax")
        })
    })
    }

        //Source Position Select MoveX
        else if (msg[0] === '/movex'){
            return obs.send("GetCurrentScene").then(data => {
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            var msgArray = msg[0].split("/")
            msgArray.shift()
            var x = Math.floor((msg[1]*2000))
            var y = Math.floor((msg[1]*2000) + 960)
            console.log(x + " " + y)
            logEverywhere(x + " " + y)
            obs.send("SetSceneItemProperties", {
                'scene-name': data.name,
                'item': currentSceneItem,
                'position': { 'x': x + 540, 'alignment': 0}
            }).catch(() => {
                console.log("ERROR: Invalis Position Syntax")
                logEverywhere("ERROR: Invalis Position Syntax")
            })
        })
        }

        //Source Position Select MoveY
        else if (msg[0] === '/movey'){
            return obs.send("GetCurrentScene").then(data => {
            console.log(`OSC IN: ${msg}`)
            logEverywhere(`OSC IN: ${msg}`)
            var msgArray = msg[0].split("/")
            msgArray.shift()
            var x = Math.floor((msg[2]*2000))
            var y = Math.floor((msg[1]*2000) + 960)
            console.log(x + " " + y)
            logEverywhere(x + " " + y)
            obs.send("SetSceneItemProperties", {
                'scene-name': data.name,
                'item': currentSceneItem,
                'position': { 'y': y, 'alignment': 0}
            }).catch(() => {
                console.log("ERROR: Invalis Position Syntax")
                logEverywhere("ERROR: Invalis Position Syntax")
            })
        })
        }

        
    //Source Align
    else if (msg[0] === '/align'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var x = 0 + 960
        var y = 0 + 540
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name.toString(),
            'item': currentSceneItem,
            'position': {'x': x, 'y':y, 'alignment': msg[1]}
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Alignment")
            logEverywhere("Error: Select A Scene Item in OBS for Alignment")
        })
    })
    }

    //Set Transition Override
    else if(msg[0].includes('/transOverrideType')){
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        var msgArray = msg[0].split("/")
        msgArray.shift()
        console.log("Messge array: " + msgArray)
        logEverywhere("Messge array: " + msgArray)
        return obs.send("GetCurrentScene").then(data => {
        obs.send("SetSceneTransitionOverride", {
            'sceneName': data.name,
            'transitionName': msgArray[1].toString(),
        })
    })
    }

    //Set Transition Override
    else if(msg[0] === '/transOverrideDuration'){
        let currentSceneName
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        return obs.send("GetCurrentScene").then(data => {
            currentSceneName = data.name
        return obs.send("GetSceneTransitionOverride", {
            'sceneName': currentSceneName
        }).then(data => {
            obs.send("SetSceneTransitionOverride", {
                'sceneName': currentSceneName,
                'transitionName': data.transitionName,
                'transitionDuration': Math.floor(msg[1])
            })
        })
        })
    }

    //Source Size
    else if (msg[0] === '/size'){
        return obs.send("GetCurrentScene").then(data => {
        console.log(`OSC IN: ${msg}`)
        logEverywhere(`OSC IN: ${msg}`)
        obs.send("SetSceneItemProperties", {
            'scene-name': data.name.toString(),
            'item': currentSceneItem,
            'scale': {'x': msg[1], 'y': msg[1]}
        }).catch(() => {
            console.log("Error: Select A Scene Item in OBS for Size")
            logEverywhere("Error: Select A Scene Item in OBS for Size")
        })
    })
    }

    //Log Error
    else {
        console.log("Error: Invalid OSC command. Please refer to Node OBSosc on Github for Command List")
        logEverywhere("Error: Invalid OSC command. Please refer to Node OBSosc on Github for Command List")
    }
});

//OBS -> OSC Client (OUT)
obs.on('SwitchScenes', data => {
    if (enableObs2App){
    client.send(`${oscOutPrefix}${data.sceneName}${oscOutSuffix}`, (err) => {  //Takes OBS Scene Name and Sends it Out as OSC String (Along with Prefix and Suffix)
        if (err) console.error(err);
            });
        }
    })
})
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
