module.exports = getTimestamp;
function checkTime(i) {
    if (i < 10) {
      i = "0" + i;
    }
    return i;
  }
function getTimestamp(){
  let today = new Date();
  let h = today.getHours();
  let m = today.getMinutes();
  let s = today.getSeconds();
  return `${checkTime(h)}:${checkTime(m)}:${checkTime(s)}`
}