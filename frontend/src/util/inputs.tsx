import React from "react";

export type ReactSetter<T> = React.Dispatch<React.SetStateAction<T>>;

export function NumberInput(props: {
  num: number;
  setNum: ReactSetter<number>;
  min?: number;
  max?: number;
  step?: number;
  className: string;
}) {
  return (
    <input
      min={props.min}
      max={props.max}
      step={props.step}
      value={props.num ? props.num.toString().replace(/^0+/g, "") : "0"}
      className={props.className}
      type="number"
      onInput={(e) => {
        props.setNum(Number(e.currentTarget.value));
      }}
    ></input>
  );
}

export function StringInput(props: {
  str: string;
  setStr: ReactSetter<string>;
  placeholder?: string;
}) {
  return (
    <input
      placeholder={props.placeholder}
      value={props.str}
      onInput={(e) => {
        props.setStr(e.currentTarget.value);
      }}
    ></input>
  );
}
