import type { PciProperties } from "@citolab/tspci";
import { IStore, useStore } from "@citolab/preact-store";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import configProps from "./config.json";
import { Pie } from "./pie";
import { StateModel } from "./store";
// Images are bundled too: `import logo from "./assets/logo.png"` gives a data URL for <img src={logo} />.

type PropTypes = PciProperties<typeof configProps>;

type Props = {
  config: PropTypes;
  store: IStore<StateModel>;
  readOnly: boolean; // review, solution, closed: show the answer, but do not change it
};

/** The interaction itself: Tailwind classes only, styles.css just loads Tailwind (into the shadow root). */
const Interaction = ({ config, store, readOnly }: Props) => {
  const { value } = useStore(store); // re-renders when the store changes
  const input = useRef<HTMLInputElement>(null);
  const [invalid, setInvalid] = useState(false);

  // aria-invalid tells assistive technology, and the aria-invalid: classes show it with a red outline.
  useLayoutEffect(() => {
    setInvalid(value !== "" && !input.current.checkValidity());
  }, [value]);

  return (
    <div className="mx-auto flex w-fit max-w-full flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-linear-to-b from-white to-slate-50 px-7 py-6 font-sans text-slate-800 shadow-lg">
      <h2 className="text-xl font-semibold tracking-tight">{config.title}</h2>
      <Pie config={config} />
      {/* htmlFor ties the question to the input: a screen reader reads it, a click on it focuses the input */}
      <label className="max-w-[32ch] cursor-pointer text-center text-slate-600" htmlFor="answer">
        {config.question}
      </label>
      <div className="flex items-center gap-1.5 text-lg font-semibold">
        <input
          ref={input}
          id="answer"
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          autoComplete="off"
          value={value}
          disabled={readOnly}
          aria-invalid={invalid}
          onInput={(e) => store.dispatch({ type: "SET_VALUE", payload: { value: e.currentTarget.value } })}
          className="w-20 rounded-lg border-[1.5px] border-slate-300 bg-white px-2.5 py-2 text-right outline-none transition [appearance:textfield] focus-visible:border-blue-500 focus-visible:ring-3 focus-visible:ring-blue-500/30 aria-invalid:border-rose-600 aria-invalid:ring-3 aria-invalid:ring-rose-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span>%</span>
      </div>
    </div>
  );
};

export default Interaction;
