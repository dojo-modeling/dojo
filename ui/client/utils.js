import { zonedTimeToUtc } from 'date-fns-tz';

export const sleep = async (t) => new Promise((r) => setTimeout(r, t));

/**
 * Parses an ISO8601-compatible datetime string from our server.
 */
export const parseDatetimeString = (value) => {
  const loc = 'UTC';
  return zonedTimeToUtc(value, loc);
};

/**
 * Formats UTC dates in a consistent format for UI display.
 * */
export const formatDatetime = (datetime) => (
  datetime != null
  ?  new Date(datetime).toISOString().replace(/T/, ' ').replace(/\..+/, ' UTC')
  : "(null)"
);

/**
 *
 **/
export function formatDateOnly(ts) {
  return ts !== null ?

    new Date(ts)
    .toISOString()
    .substring(0, 10)

    : "(null)";
}

/**
 *
 **/
export const matchFileNameExtension = (fileName) => {
  const regex=/\.[0-9a-z]+$/i;
  return fileName.match(regex);
};


export const splitOnWildCard = (filepath) => {
  let parent_str, children_str;
  if(!/\*/.test(filepath)) {
      if(!/\//.test(filepath)) {
          parent_str = "";
          children_str = filepath;
      }
      else {
          let parts = filepath.split("/");
          parent_str = parts.slice(0, parts.length-1).join("/");
          children_str = parts[parts.length-1];
      }
  }
  else {
      let parent = [];
      let children = [];
      let flag = false;
      let dirs = filepath.split("/");
      for (const dir of dirs) {
          if(/\*/.test(dir)) {
              flag = true;
          }
          if (flag) {
              children.push(dir);
          }
          else {
              parent.push(dir);
          }
      }
      if (!flag) {
          children.push(parent.pop());
      }
      if (!parent.length) {
          parent_str = "/";
      }
      else {
          parent_str = parent.join("/");
      }
      children_str = children.join("/");
  }
  return [parent_str, children_str];
};
