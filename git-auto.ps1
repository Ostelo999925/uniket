param([string]$msg = "Auto-commit")
git add .
git commit -m "$msg"
git push

//powershell ./git-auto.ps1 "Your commit message"