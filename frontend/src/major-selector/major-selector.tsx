import { useState } from "react";
import { api, trpc } from "../api/index.js";
import { StringInput } from "../util/inputs.js";
import React from "react";

export function MajorSelector(props: {
  loadMajor: (majorReqs: unknown) => void;
}) {
  const majors = trpc.getSupportedMajors.useQuery();

  const [major, setMajor] = useState("Select Major");

  const options = trpc.getSupportedOptions.useQuery(major);

  const [option, setOption] = useState("Select Option");

  let optionsArr = undefined;

  optionsArr = options.data ? Object.entries(options.data) : null;

  console.log(options.data);

  return (
    <div className="major-selector">
      <select
        onChange={(e) => {
          setMajor(e.currentTarget.value);
        }}
        value={major}
      >
        <option value="null">Select Major</option>
        {majors.data &&
          majors.data.map((m) => (
            <option value={m} key={m}>
              {m}
            </option>
          ))}
      </select>
      {optionsArr && optionsArr.length > 0 && (
        <select
          onChange={(e) => {
            setOption(e.currentTarget.value);
          }}
          value={option}
        >
          <option value="null">Select Option</option>
          {optionsArr.map((o) => (
            <option value={o[1] as string} key={o[1] as string}>
              {o[0]}
            </option>
          ))}
        </select>
      )}
      {major !== "Select Major" &&
        option !== "Select Option" &&
        majors.data &&
        major !== "null" &&
        (optionsArr?.length == 0 || option !== "null") && (
          <button
            onClick={async (e) => {
              const majorReqs = await api.getMajorRequirements.query({
                major,
                option: option === "null" ? undefined : option,
              });

              console.log(majorReqs);

              props.loadMajor(majorReqs);
            }}
          >
            Load Major
          </button>
        )}
    </div>
  );
}
