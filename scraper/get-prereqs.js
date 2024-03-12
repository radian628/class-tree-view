import fetch from "node-fetch";
import { NodeType, parse } from "node-html-parser";
import {
  rule,
  alt_sc,
  seq,
  expectSingleResult,
  lrec_sc,
  str,
  kmid,
  apply,
  tok,
  alt,
  expectEOF,
} from "typescript-parsec";

// get raw prerequisite table data for a class
export async function getPrereqsRaw(term, crn) {
  const res = await fetch(
    "https://prodapps.isadm.oregonstate.edu/StudentRegistrationSsb/ssb/searchResults/getSectionPrerequisites",
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: `term=${term}&courseReferenceNumber=${crn}`,
      method: "POST",
      mode: "cors",
    }
  );

  return res.text();
}

// get neatly JSON formatted prerequisite table data
export async function getPrereqs(term, crn) {
  const raw = await getPrereqsRaw(term, crn);

  const tree = parse(raw);

  const prereqTableBody = tree.querySelector("tbody");

  if (!prereqTableBody) return undefined;

  const rows = prereqTableBody.querySelectorAll("tr");

  const prereqsList = rows.map((r) =>
    r.childNodes
      .filter((cn) => cn.nodeType === NodeType.ELEMENT_NODE)
      .map((cn) => cn.innerText)
  );

  const formattedPrereqList = prereqsList.map(
    ([
      andOr,
      openParen,
      test,
      score,
      subject,
      number,
      level,
      gradeReq,
      closeParen,
    ]) => {
      return {
        andOr,
        openParen,
        test,
        score,
        subject,
        number,
        level,
        gradeReq,
        closeParen,
      };
    }
  );

  return formattedPrereqList;
}

// parsing rules for converting prereq JSON table data to a propositional logic tree
const EXPR = rule();
const AND_OR = rule();

EXPR.setPattern(
  alt_sc(
    apply(tok("object"), (cls) => ({
      type: "class",
      class: cls.data,
    })),

    kmid(str("("), AND_OR, str(")"))
  )
);

AND_OR.setPattern(
  lrec_sc(
    EXPR,
    seq(alt_sc(str("And"), str("Or")), EXPR),
    (left, [operator, right]) => {
      return {
        type: "operator",
        operator: operator.text.toLowerCase(),
        operands: [
          ...(left.operator === operator.text ? left.operands : [left]),
          right,
        ],
      };
    }
  )
);

// get propositional logic tree of required prereqs for a class
// can return undefined if no prereqs
export async function getPrereqsSyntaxTree(term, crn) {
  const list = await getPrereqs(term, crn);

  if (list === undefined) return undefined;

  // expand out prereq table rows into tokens
  const tokens = list
    .map((e) => {
      return [
        e.andOr,
        e.openParen,
        e.subject || e.test ? e : undefined,
        e.closeParen,
      ].map((x) => x);
    })
    .flat(1)
    .filter((x) => x);

  // create a linked list of tokens
  function constructTokenList(list, index) {
    if (list.length === 0) return undefined;

    return {
      kind: typeof list[0],
      text: typeof list[0] === "string" ? list[0] : JSON.stringify(list[0]),
      pos: {
        index,
        rowBegin: 0,
        columnBegin: 0,
        rowEnd: 0,
        columnEnd: 0,
      },
      next: constructTokenList(list.slice(1), index + 1),
      data: list[0],
    };
  }
  const tokenLL = constructTokenList(tokens, 0);

  // debug function for printing token lists
  function printll(ll) {
    if (!ll) return;
    printll(ll.next);
  }

  // parse it
  try {
    return expectSingleResult(expectEOF(AND_OR.parse(tokenLL)));
  } catch (err) {
    console.log("ERROR:", crn, tokens);
    // TODO: deal with weird classes with nonstandard prereqs later
    // throw err;
    return undefined;
  }
}

// debug function for pretty-printing prereq trees
export function getHumanReadableSyntaxTree(tree) {
  const r = (tree) => {
    switch (tree.type) {
      case "operator":
        return `(${tree.operands
          .map((op) => r(op))
          .join(` ${tree.operator} `)})`;
      case "class":
        return `(${tree.class.subject} ${tree.class.number})`;
    }
  };

  return r(tree);
}
