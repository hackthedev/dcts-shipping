# Define an array of GitHub repos in the format "owner/repo"
$repos = @(
    "hackthedev/test"
)

# Function to download and extract the latest release from a repo
function Download-And-Extract-LatestRelease {
    param (
        [string]$repo
    )

    Write-Host "Processing $repo..."

    # Construct the URL for the latest release
    $url = "https://api.github.com/repos/$repo/releases/latest"
    Write-Host "Fetching release info from: $url"

    # Get the latest release information
    $response = Invoke-RestMethod -Uri $url
    $zipballUrl = $response.zipball_url

    if (-not $zipballUrl) {
        Write-Host "Failed to get the latest release for $repo"
        return
    }

    Write-Host "Download URL: $zipballUrl"

    # Download the latest release
    $zipPath = "latest.zip"
    Invoke-WebRequest -Uri $zipballUrl -OutFile $zipPath

    if (-not (Test-Path -Path $zipPath)) {
        Write-Host "Failed to download the latest release for $repo"
        return
    }

    # Extract the release into a temporary directory
    $tempDir = New-Item -ItemType Directory -Path (Join-Path $env:TEMP "extract_$repo")
    Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force

    # Move the contents of the extracted folder to the current directory
    $extractedDir = Get-ChildItem -Path $tempDir -Directory | Select-Object -First 1
    if ($extractedDir -ne $null) {
        Get-ChildItem -Path $extractedDir.FullName | Move-Item -Destination . -Force
    }

    # Remove the temporary directory and the zip file after extraction
    Remove-Item -Path $tempDir -Recurse -Force
    Remove-Item -Path $zipPath -Force

    Write-Host "Completed $repo"
}

# Iterate through each repo and process it
foreach ($repo in $repos) {
    Download-And-Extract-LatestRelease -repo $repo
}

Write-Host "All repositories processed."
