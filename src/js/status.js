const stepMs = 1000;
const maxMs = 60 * 1000;

const checkStatus = (waitTime) => {
  const waitElement = document.getElementById("waitTime");
  if (waitTime > maxMs) {
    if (waitElement) {
      waitElement.textContent = "Sign-in failed - timed out";
      document.getElementById("description").style.display = "none";
      document.getElementById("qrCode").style.display = "none";
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
