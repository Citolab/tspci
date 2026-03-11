import { useStore, IStore, Action } from "@citolab/preact-store";
import { ActionType, StateModel } from "./store";
import configProps from "./config.json";
import { useState } from "preact/hooks";

import procenten from "./assets/procenten.png"; // image types are bundled inside the js

type PropTypes = typeof configProps;

const Interaction = ({ config, dom, store }: { config: PropTypes; dom: Document | ShadowRoot, store: IStore<StateModel> }) => {
  const state = useStore(store);
  const [eventHandled, setEventHandled] = useState<boolean>(false);
  
  const handleInput = (e: Event) => {
    if (!eventHandled) {
      const input = e.target as HTMLInputElement;
      store.dispatch<{ input: number }>({ type: "SET_INPUT", payload: { input: +input.value } });
      setEventHandled(true);
    }
  };

  return <div className="pci-container">
    <h1 className="title">{config.title}</h1>
    <div className="body">
      <img className="body-image" width={config.width} height={+config.height} src={procenten} alt="Percentages visual" />
    </div>
    <div className="interaction">
      <label className="prompt" htmlFor="percentage-input">{config.prompt}</label>
      <div className="answer-row">
        <input className="answer-input"
          id="percentage-input"
          type="number"
          value={state.input}
          onInput={handleInput}
          onPaste={() => setEventHandled(false)}
          onKeyDown={() => setEventHandled(false)}
          min="0" max="100" />
        <span className="answer-suffix">%</span>
      </div>
    </div>
  </div>;
};


export default Interaction;
