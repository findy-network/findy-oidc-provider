const stepMs = 3000;
const maxMs = 3 * 60 * 1000;

const checkStatus = (waitTime) => {
  const waitElement = document.getElementById("waitTime");
  if (waitTime > maxMs) {
    if (waitElement) {
      waitElement.textContent = "Login failed";
    }
  } else {
    const remainingTime = maxMs - waitTime;
    if (waitElement) {
      waitElement.textContent = `${remainingTime / 1000} seconds remaining`;
    }
    setTimeout(() => {
      const xhttp = new XMLHttpRequest();
      const loginUid = document.getElementsByName("login")[0].value;
      const url = `/interaction/invitation/${loginUid}`;
      xhttp.open("GET", url, true);
      xhttp.send();
      xhttp.onreadystatechange = (e) => {
        const { target } = e;
        if (target.readyState == 4) {
          if (target.status == 200) {
            document.getElementById("invitation").submit();
          } else {
            checkStatus(waitTime + stepMs);
          }
        }
      };
    }, stepMs);
  }
};
checkStatus(0);
