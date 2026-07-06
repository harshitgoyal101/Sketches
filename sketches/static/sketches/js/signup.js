function isSimilarToUsername(password, username) {
  if (!password || !username) return true;
  const pass = password.toLowerCase();
  const user = username.toLowerCase();
  if (pass === user) return false;
  if (user.length >= 3 && pass.includes(user)) return false;
  return true;
}

function updateRequirement(item, met) {
  item.classList.toggle("is-met", met);
  item.classList.toggle("is-unmet", !met);
}

function evaluatePasswordRules(password, username, confirm) {
  if (!password) {
    return {
      length: false,
      letter: false,
      number: false,
      symbol: false,
      similar: false,
      match: false,
    };
  }

  return {
    length: password.length >= 8,
    letter: /[A-Za-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
    similar: isSimilarToUsername(password, username),
    match: confirm.length > 0 && password === confirm,
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  if (!form) return;

  const password1 = form.querySelector("[data-password-primary]");
  const password2 = form.querySelector("[data-password-confirm]");
  const username = form.querySelector("#id_username");
  const requirements = document.querySelectorAll(".password-requirement");

  const refreshRequirements = () => {
    const rules = evaluatePasswordRules(
      password1?.value || "",
      username?.value || "",
      password2?.value || ""
    );

    requirements.forEach((item) => {
      const rule = item.dataset.rule;
      updateRequirement(item, Boolean(rules[rule]));
    });
  };

  [password1, password2, username].forEach((input) => {
    input?.addEventListener("input", refreshRequirements);
  });

  refreshRequirements();
});
