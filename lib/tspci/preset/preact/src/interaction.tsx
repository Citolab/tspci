import { useStore } from "@citolab/preact-store";
import { ActionType, StateModel } from "./store";
import configProps from "./config.json";
import procenten from "./assets/procenten.png"; // image types are bundled inside the js

type PropTypes = typeof configProps;

const Interaction = ({ config, dom }: { config: PropTypes; dom: Document | ShadowRoot }) => {
  const [state, dispatch] = useStore<StateModel, ActionType>(
    (type, payload) => {
      console.log(`type: ${type}, payload: ${JSON.stringify(payload)}`);
    }
  );
  return <div className="pci-container">
    <h1>{config.title}</h1>
    <div className="body">
      <img width={config.width} height={+config.height} src={procenten} />
    </div>
    <div className="interaction">
      <label htmlFor="tentacles">{config.prompt}</label>
      <input type="number"
        onKeyUp={(e) => {
          const input = e.target as HTMLInputElement;
          dispatch<{ input: number }>("SET_INPUT", { input: +input.value });
        }
      onChange={(e) => {
          const input = e.target as HTMLInputElement;
          dispatch<{ input: number }>("SET_INPUT", { input: +input.value });
        }} min="0" max="100" />%
    </div>
  </div>;
};


export default Interaction;
