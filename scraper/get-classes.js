import fetch from "node-fetch";
import process from "node:process";

export async function getDataForTerm(term) {
  // load initial page to get session cookies (JSESSIONID is probably the most important)
  const initRes = await fetch(
    "https://prodapps.isadm.oregonstate.edu/StudentRegistrationSsb/ssb/term/termSelection?mode=search"
  );

  let cookies = initRes.headers.get("set-cookie");

  // get extz cookie from stylesheet
  const stylesheetRes = await fetch(
    "https://prodapps.isadm.oregonstate.edu/BannerExtensibility/theme/getTheme?name=prod&template=studentregistrationssb-9_30-fix-pd0003312-withcolormod",
    {
      credentials: "include",
      headers: {
        cookie: cookies,
      },
      method: "GET",
      mode: "cors",
    }
  );

  // combine cookies fom both requests and format them into key-value pairs
  cookies = stylesheetRes.headers.get("set-cookie") + ";" + cookies;
  const cookieList = cookies
    .split(/[;,]/g)
    .map((cookie) => cookie.replace(/ /g, "").split("="));
  const cookieMap = new Map(cookieList);

  // filter out cookies we don't need (we only care about JSESSIONID, JSESSIONID_Sturegss, and JSESSIONID_Extz)
  const cookieMapIDsOnly = new Map();
  for (let key of ["JSESSIONID", "JSESSIONID_Sturegss", "JSESSIONID_Extz"]) {
    cookieMapIDsOnly.set(key, cookieMap.get(key));
  }
  cookies = [...cookieMapIDsOnly.entries()].map((e) => e.join("=")).join("; ");

  // generate uniqueSessionId
  const uniqueSessionId = Math.random().toString(36).substr(2, 5) + Date.now();

  // tell it which term you want to get data from with a POST request
  const setSearchModeRes = await fetch(
    "https://prodapps.isadm.oregonstate.edu/StudentRegistrationSsb/ssb/term/search?mode=search",
    {
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        cookie: cookies,
      },
      body: `term=${term}&studyPath=&studyPathText=&startDatepicker=&endDatepicker=&uniqueSessionId=${uniqueSessionId}`,
      method: "POST",
      mode: "cors",
    }
  );
  const setSearchModeJson = await setSearchModeRes.json();

  // get data from the search
  async function getClasses(count, offset) {
    const dataRes = await fetch(
      `https://prodapps.isadm.oregonstate.edu/StudentRegistrationSsb/ssb/searchResults/searchResults?txt_term=${term}&startDatepicker=&endDatepicker=&pageOffset=${offset}&pageMaxSize=${count}&sortColumn=subjectDescription&sortDirection=asc&uniqueSessionId=${uniqueSessionId}`,
      {
        credentials: "include",
        headers: {
          cookie: cookies,
        },
        method: "GET",
        mode: "cors",
      }
    );

    const dataJson = await dataRes.json();

    return dataJson;
  }

  // number of classes offered
  const classCount = (await getClasses(10, 0)).totalCount;

  // load classes in, 250 at a time
  const pageSize = 250;
  const classDataRequests = [];
  const requestsRequired = Math.ceil(classCount / pageSize);
  let requestsFulfilled = 0;
  for (let i = 0; i < classCount; i += pageSize) {
    classDataRequests.push(
      getClasses(pageSize, i).then((data) => {
        console.log(
          `${++requestsFulfilled} / ${requestsRequired} Pages of Classes Received`
        );
        return data;
      })
    );
  }

  console.log("Done!");

  return await Promise.all(classDataRequests);
}
