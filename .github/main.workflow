workflow "Test" {
  on = "push"
  resolves = ["Execute Tests"]
}

action "Install Dependencies" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  runs = "install"
}

action "Execute Tests" {
  uses = "actions/npm@59b64a598378f31e49cb76f27d6f3312b582f680"
  runs = "test"
  needs = ["Install Dependencies"]
}
