$gitExe = Join-Path (Get-Location) ".git-bin\mingw64\bin\git.exe"

if (Test-Path $gitExe) {
    Write-Output "Found Git at $gitExe"
    Write-Output "Configuring Git identity..."
    & $gitExe config user.name "The Coach Manuel"
    & $gitExe config user.email "thecoachmanuel@github.com"

    Write-Output "Adding files..."
    & $gitExe add .

    Write-Output "Committing..."
    & $gitExe commit -m "first commit"

    Write-Output "Setting branch main..."
    & $gitExe branch -M main

    & $gitExe remote remove origin 2>$null
    Write-Output "Adding remote origin..."
    & $gitExe remote add origin https://github.com/thecoachmanuel/ai-receptionist.git

    Write-Output "Pushing to GitHub..."
    & $gitExe push -u origin main
} else {
    Write-Error "git.exe not found at $gitExe"
}
