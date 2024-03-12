import { useEffect, useRef, useState } from "react";
import { CourseRaw } from "../../../backend/load-courses.js";
import { ReactSetter, StringInput } from "../util/inputs.js";
import React from "react";
import { api } from "../api/index.js";
import "./ClassSearch.less";

export function ClassSectionSearchResult(props: { result: CourseRaw }) {
  return (
    <div>
      Title: {props.result.courseTitle}, Term: {props.result.term}
    </div>
  );
}

function isScrolledIntoView(elem: HTMLElement, parent: HTMLElement) {
  const elemTop = elem.getBoundingClientRect().top;
  const parentBottom = parent.getBoundingClientRect().bottom;
  return elemTop < parentBottom;
}

const NUMBER_TO_ADD = 30;

export function ClassSectionSearch(props: {
  results: CourseRaw[];
  setResults: ReactSetter<CourseRaw[]>;
}) {
  const [localResults, setLocalResults] = useState<Record<string, CourseRaw>>(
    {}
  );

  const [query, setQuery] = useState<string>("");

  const bottomElemRef = useRef<HTMLDivElement | null>(null);
  const rootElemRef = useRef<HTMLDivElement | null>(null);

  const [doneQuerying, setDoneQuerying] = useState(true);

  const [queryOffset, setQueryOffset] = useState(0);

  async function loadMore() {
    const bottomElem = bottomElemRef.current;
    const rootElem = rootElemRef.current;
    if (doneQuerying || !bottomElem || !rootElem) return;

    if (isScrolledIntoView(bottomElem, rootElem)) {
      const results = await api.courseSections.query({
        subjectCourse: query,
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
    }
  }

  useEffect(() => {
    loadMore();
  }, [query, queryOffset]);

  return (
    <div className="class-search">
      <StringInput
        str={query}
        setStr={(q) => {
          setQuery(q);
          setQueryOffset(0);
          setDoneQuerying(false);
          setLocalResults({});
        }}
      ></StringInput>
      <div
        className="class-search-results"
        ref={rootElemRef}
        onScroll={() => {
          console.log("got here");
          loadMore();
        }}
      >
        {Object.values(localResults)
          .sort((a, b) => b.term.localeCompare(a.term))
          .map((r) => (
            <ClassSectionSearchResult
              result={r}
              key={r.courseReferenceNumber + "-" + r.term}
            ></ClassSectionSearchResult>
          ))}
        <div className="bottom-detector" ref={bottomElemRef}>
          {doneQuerying
            ? "That's all the data we have!"
            : queryOffset === 0
            ? "Loading..."
            : ""}
        </div>
      </div>
    </div>
  );
}
