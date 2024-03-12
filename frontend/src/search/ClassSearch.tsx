import { useEffect, useRef, useState } from "react";
import { CourseRaw } from "../../../backend/load-courses.js";
import { ReactSetter, StringInput } from "../util/inputs.js";
import React from "react";
import { api } from "../api/index.js";
import "./ClassSearch.less";

export function ClassSectionSearchResult(props: { result: CourseRaw }) {
  return (
    <li className="class-search-result">
      <div className="class-subject-course">
        {props.result.subject}&nbsp;{props.result.courseNumber}
      </div>
      <div className="class-title">{props.result.courseTitle}</div>
    </li>
  );
}

function isScrolledIntoView(elem: HTMLElement, parent: HTMLElement) {
  const elemTop = elem.getBoundingClientRect().top;
  const parentBottom = parent.getBoundingClientRect().bottom;
  return elemTop < parentBottom;
}

const NUMBER_TO_ADD = 30;

export function ClassSearch(props: {
  results: CourseRaw[];
  setResults: ReactSetter<CourseRaw[]>;
}) {
  const [localResults, setLocalResults] = useState<Record<string, CourseRaw>>(
    {}
  );

  const [inputQuery, setInputQuery] = useState<string>("");

  const [query, setQuery] = useState<string>("");

  const bottomElemRef = useRef<HTMLLIElement | null>(null);
  const rootElemRef = useRef<HTMLUListElement | null>(null);

  const [doneQuerying, setDoneQuerying] = useState(true);

  const waitingForQueryFinishRef = useRef(false);

  const [queryOffset, setQueryOffset] = useState(0);

  async function loadMore() {
    const bottomElem = bottomElemRef.current;
    const rootElem = rootElemRef.current;

    if (
      waitingForQueryFinishRef.current ||
      doneQuerying ||
      !bottomElem ||
      !rootElem
    )
      return;

    if (isScrolledIntoView(bottomElem, rootElem)) {
      waitingForQueryFinishRef.current = true;
      const results = await api.latestCourse.query({
        query,
        limit: NUMBER_TO_ADD,
        offset: queryOffset,
      });

      setLocalResults((r) => ({
        ...r,
        ...Object.fromEntries(
          results.map((r) => [r.courseReferenceNumber + "-" + r.term, r])
        ),
      }));
      setQueryOffset((q) => q + NUMBER_TO_ADD);
      setDoneQuerying(results.length === 0);
      waitingForQueryFinishRef.current = false;
      console.log("finished loadMore");
    }
  }

  useEffect(() => {
    loadMore();
  }, [query, queryOffset]);

  function doSearch() {
    setQueryOffset(0);
    setDoneQuerying(false);
    setLocalResults({});
    setQuery(inputQuery);
  }

  return (
    <div className="class-search">
      <div
        className="class-search-header"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            doSearch();
          }
        }}
      >
        <StringInput
          str={inputQuery}
          setStr={(q) => {
            setInputQuery(q);
          }}
        ></StringInput>
        <button
          onClick={(e) => {
            doSearch();
          }}
        >
          Search
        </button>
      </div>
      <ul
        className="class-search-results"
        ref={rootElemRef}
        onScroll={() => {
          loadMore();
        }}
      >
        {Object.values(localResults).map((r) => (
          <ClassSectionSearchResult
            result={r}
            key={r.courseReferenceNumber + "-" + r.term}
          ></ClassSectionSearchResult>
        ))}
        <li className="bottom-detector" ref={bottomElemRef}>
          {doneQuerying
            ? query
              ? Object.keys(localResults).length === 0
                ? "Nothing found."
                : "That's all the data we have!"
              : "Enter a search query!"
            : "Loading..."}
        </li>
      </ul>
    </div>
  );
}
