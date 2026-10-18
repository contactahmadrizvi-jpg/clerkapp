# deploy.ps1 — builds backend and deploys to AWS Lambda via SAM
# Run from inside the backend/ folder: .\deploy.ps1

Write-Host "Step 1: Installing production dependencies..." -ForegroundColor Cyan
npm ci --omit=dev

Write-Host "Step 2: Compiling TypeScript..." -ForegroundColor Cyan
npm run build

Write-Host "Step 3: Copying node_modules into dist..." -ForegroundColor Cyan
Copy-Item -Recurse -Force "node_modules" "dist\node_modules"

Write-Host "Step 4: Running SAM deploy..." -ForegroundColor Cyan
Set-Location ..\infrastructure

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

sam deploy --guided `
  --region eu-north-1 `
  --stack-name clerk-auth-app `
  --capabilities CAPABILITY_IAM `
  --resolve-s3

Write-Host "Deploy complete!" -ForegroundColor Green
