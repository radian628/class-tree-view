import {
  getHumanReadableSyntaxTree,
  getPrereqsSyntaxTree,
} from "./get-prereqs.js";

console.log(JSON.stringify(await getPrereqsSyntaxTree("202403", "52708")));

const a = {
  type: "operator",
  operator: "And",
  operands: [
    {
      type: "operator",
      operator: "Or",
      operands: [
        // {
        //   type: "class",
        //   class: {
        //     andOr: "",
        //     openParen: "(",
        //     test: "",
        //     score: "",
        //     subject: "Computer Science",
        //     number: "344",
        //     level: "Undergraduate",
        //     gradeReq: "C",
        //     closeParen: "",
        //   },
        // },
        {
          type: "class",
          class: {
            andOr: "Or",
            openParen: "",
            test: "",
            score: "",
            subject: "Computer Science",
            number: "374",
            level: "Undergraduate",
            gradeReq: "C",
            closeParen: ")",
          },
        },
      ],
    },
    {
      type: "operator",
      operator: "Or",
      operands: [
        {
          type: "class",
          class: {
            andOr: "And",
            openParen: "(",
            test: "",
            score: "",
            subject: "Computer Science",
            number: "271",
            level: "Undergraduate",
            gradeReq: "C",
            closeParen: "",
          },
        },
        {
          type: "class",
          class: {
            andOr: "Or",
            openParen: "",
            test: "",
            score: "",
            subject: "Electrical &amp; Computer Engineer",
            number: "375",
            level: "Undergraduate",
            gradeReq: "C",
            closeParen: ")",
          },
        },
      ],
    },
  ],
};
