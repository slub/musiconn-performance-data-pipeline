import express from 'express';
import ws from 'ws';
import {Stream} from "stream";
import {runPipeline} from "./fromEleasticToRDF";
import {turtle} from "@tpluscode/rdf-string";
import {Readable} from "stronger-typed-streams";

const app = express();

const wsServer = new ws.Server({noServer: true});
let pipeline: Stream | undefined,
    readable: Readable<any> | undefined;
wsServer.on('connection', websocket => {
    console.log('⚡️ websocket connection established. Listening...')

    websocket.on('message', async (message) => {
        const incomming = message.toString()
        console.log(`📥 Incomming message: "${message.toString()}"`);

        switch (incomming) {
            case 'start': {
                console.log('will start pipeline')
                const { readable, pipeline} = await runPipeline((o) => {
                    //console.log(o)
                    websocket.send(JSON.stringify(o))
                }, (ds) => {
                    websocket.send(JSON.stringify({
                        index: 'turtle',
                        data: turtle`${ds}`.toString()
                    }))
                })
                console.log('will set events pipeline')
                pipeline.on('end', () => {
                    websocket.send(JSON.stringify({message: 'end'}))
                })
                break;
            }
            case 'pause': {
                if (readable) {
                    readable.pause();
                }
                break;
            }
            case 'resume': {
                if (readable && readable.isPaused()) {
                    readable.resume();
                }
                break
            }
            default:
                websocket.send(JSON.stringify({message: 'unknown command'}));

        }

    });

    websocket.on('close', () => {
        console.log('❌ websocket connection closed');
    });
});

app.get('/', ({headers}, res) => {
    const wsURL = `ws://${headers.host}`
    res.send(`Connect via websocket: ${wsURL}`);
});

const port = 5000 || process.env.PORT;
const server = app.listen(port, () => {
    console.log(`Listening on port ${port} for websocket requests`);
});

// register handler to upgrade initial http request to websocket connection
server.on('upgrade', (req, socket, head) => {
    console.log('upgrading request to websocket connection - url:', req.url);

    wsServer.handleUpgrade(req, socket, head, socket => {
        wsServer.emit('connection', socket, req);
    });
});