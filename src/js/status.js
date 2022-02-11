const checkStatus = () => {
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
          checkStatus();
        }
      }
    };
  }, 1000);
};
checkStatus();
