import React, { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import Typography from "@material-ui/core/Typography";
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import VexFlow from 'vexflow';
import * as Tone from 'tone';

const VF = VexFlow.Flow
const { Formatter, Renderer, Stave, StaveNote } = VF
const clefAndTimeWidth = 60

const sampler = new Tone.Sampler({
	urls: {
		"C4": "C4.mp3",
		"D#4": "Ds4.mp3",
		"F#4": "Fs4.mp3",
		"A4": "A4.mp3",
	},
	release: 1,
	baseUrl: "https://tonejs.github.io/audio/salamander/",
}).toDestination();

export function Score({
  staves = [],
  clef = 'treble',
  timeSignature = '4/4',
  width = 800,
  height = 300,
}) {
  const container = useRef()
  const rendererRef = useRef()

  useEffect(() => {
    if (rendererRef.current == null) {
      rendererRef.current = new Renderer(
        container.current,
        Renderer.Backends.SVG
      )
    }
    const renderer = rendererRef.current
    renderer.resize(width, height)
    const context = renderer.getContext()
    const svg = context.svg;
    while (svg.lastChild) {
        svg.removeChild(svg.lastChild);
    }

    context.setFont('Arial', 10, '').setBackgroundFillStyle('#eed')
    const staveWidth = (width - clefAndTimeWidth) / 10

    let currX = 0
    staves.forEach((notes, i) => {
      const index = Math.trunc(i/10);
      if (i % 10 === 0) {
        currX = 0;
      }
      const stave = new Stave(currX, index*100, staveWidth)
      if (i === 0) {
        stave.setWidth(staveWidth + clefAndTimeWidth)
        stave.addClef(clef).addTimeSignature(timeSignature)
      }
      currX += stave.getWidth()
      stave.setContext(context).draw()

      const processedNotes = notes
        .map(note => (typeof note === 'string' ? { key: note } : note))
        .map(note =>
          Array.isArray(note) ? { key: note[0], duration: note[1] } : note
        )
        .map(({ key, ...rest }) => 
          typeof key === 'string'
            ? {
                key: key.includes('/') ? key : `${key[0]}/${key.slice(1)}`,
                ...rest,
              }
            : rest
        )
        .map(
          ({ key, keys, duration = 'q' }) =>
            new StaveNote({
              keys: key ? [key] : keys,
              duration: String(duration),
            })
        )
      Formatter.FormatAndDraw(context, stave, processedNotes, {
        auto_beam: true,
      })
    })
  }, [staves])

  return <div ref={container} />
}

// https://www.w3.org/TR/webmidi/


function Commands({ commands }: {commands: MIDICommand[]}): JSX.Element {
    return (
        <TableContainer>
            <Table size="small" aria-label="a dense table">
                <TableHead>
                    <TableRow>
                        <TableCell>Id</TableCell>
                        <TableCell align="right">Command</TableCell>
                        <TableCell align="right">Channel</TableCell>
                        <TableCell align="right">Note</TableCell>
                        <TableCell align="right">Velocity</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {commands.map((command, id) => (
                        <TableRow key={id}>
                            <TableCell component="th" scope="row">
                                {id}
                            </TableCell>
                            <TableCell align="right">{command.command}</TableCell>
                            <TableCell align="right">{command.channel}</TableCell>
                            <TableCell align="right">{command.note}</TableCell>
                            <TableCell align="right">{command.velocity}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}

interface MIDICommand {
    command: number;
    channel: number;
    note: number;
    velocity: number;
}

function midiToPitch(midi: number): string {
	const octave = Math.floor(midi / 12) - 1;
	return midiToPitchClass(midi) + octave.toString();
}

function midiToPitchClass(midi: number): string {
	const scaleIndexToNote = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
	const note = midi % 12;
	return scaleIndexToNote[note];
}

function App(): JSX.Element {

    const [data, setData] = React.useState<Array<MIDICommand>>([]);
    const [staves, setStaves] = React.useState([]);

    useEffect(() => {
        async function fetch(): Promise<void> {
            const a = await navigator.requestMIDIAccess();
            a.inputs.forEach((input, key) => {
                input.addEventListener("midimessage", (e: WebMidi.MIDIMessageEvent) => {
                    console.log(e.timeStamp)
                    const command = e.data[0] >> 4;
                    const channel = e.data[0] & 0xf;
                    const note = e.data[1];
                    const velocity = e.data[2] / 127;

                    //data.push({command: command, channel: channel, note: note, velocity: velocity})
                    //setData([...data]);
                    const pitch = midiToPitch(note);
                    if (command == 8) {
                        staves.push([pitch])
                        setStaves([...staves]);
                    } else if (command == 9) {
                    //    sampler.triggerAttackRelease(pitch, "8n");
                    }
                });
            })
            a.onstatechange = function(event) {
                console.log(event.port);
            }
        }

        fetch();
      }, []);

    const theme = createMuiTheme({
        palette: {
          type: 'dark',
        },
    });
    return (
        <ThemeProvider theme={theme}>
            <div style={{ display: "flex", width: "100vw", flexDirection: "column", height: "100vh", justifyContent: "center" }}>
                <div style={{display: "flex", alignItems: "center", justifyContent: "center", flex: 1, background: "white", }}>
                    <Score staves={staves} />
                </div>
                <div style={{flex: 1, overflow: "auto"}}>
                    <Commands commands={data}></Commands>
                </div>
            </div>
        </ThemeProvider>
    );
}

function main(): void {
    ReactDOM.render(
        <App />,
        document.querySelector("main")
    );
}

main();
