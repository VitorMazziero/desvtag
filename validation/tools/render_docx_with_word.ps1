# Converte relatórios .docx em PDF com o Microsoft Word instalado (COM), para conferir a paginação
# real do Word (AU-U10/AU-U11, ET28). Uso: render_docx_with_word.ps1 <pasta-de-entrada> <pasta-de-saída>
# Grava <nome>.pdf e word-verification.json (versão do Word, páginas, hashes de origem e de saída).
param(
  [Parameter(Mandatory = $true)][string]$InputFolder,
  [Parameter(Mandatory = $true)][string]$OutputFolder
)
$ErrorActionPreference = "Stop"
New-Item -ItemType Directory -Force -Path $OutputFolder | Out-Null
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$results = @()
try {
  foreach ($file in Get-ChildItem -Path $InputFolder -Recurse -Filter *.docx) {
    $document = $word.Documents.Open($file.FullName, $false, $true)
    try {
      $document.Repaginate()
      $pages = $document.ComputeStatistics(2)
      $target = Join-Path $OutputFolder ($file.BaseName + ".pdf")
      $document.ExportAsFixedFormat($target, 17)
      $results += [pscustomobject]@{
        name = $file.BaseName
        wordVersion = $word.Version
        pages = $pages
        sourceSha256 = (Get-FileHash $file.FullName -Algorithm SHA256).Hash
        renderedSha256 = (Get-FileHash $target -Algorithm SHA256).Hash
      }
    } finally {
      $document.Close($false)
    }
  }
} finally {
  $word.Quit()
}
$results | ConvertTo-Json | Set-Content -Path (Join-Path $OutputFolder "word-verification.json") -Encoding UTF8
$results | Format-Table name, pages -AutoSize
