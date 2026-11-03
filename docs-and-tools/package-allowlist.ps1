#Requires -Version 7.0
<#
.SYNOPSIS
    THE ALLOWLIST: the single definition of what a deployment package contains.

.DESCRIPTION
    Dot-sourced by build-package.ps1 and verify-package.ps1. It is not runnable on
    its own and produces no output.

    ⚠️ This is an ALLOWLIST and must never become a denylist. docs-and-tools/ holds
    kata-api-key.txt — a live key — so a denylist with one missing entry publishes it.
    A file ships only if a rule here says it does.

    That is not hypothetical here. Every package before 2026-09-07 was cut by hand from
    a denylist written in prose inside DEPLOY.md, and the 2026-09-01 DEPLOY.md records
    that denylist being patched *after* a new root-level document appeared:
    "the packaging rules previously excluded only README.md, so the build was extended
    to exclude it". An allowlist cannot fail that way — a new file at the root simply
    does not match $RootFiles.

    ⚠️ EDIT THIS FILE AND NOTHING ELSE when what ships changes. The builder and the
    verifier both read it, which is what stops a package from being built to one
    definition and checked against another.

        build-package.ps1   — copies exactly the files Test-Ships accepts
        verify-package.ps1  — asserts the package IS exactly those files

    This file never ships: docs-and-tools/ is excluded wholesale, and *.ps1 twice over.

.NOTES
    methodica-science-mass-density-01 (2026-11-02): copied from methodica-science-body-matter-01
    (itself from the ratio units). build-package.ps1 and verify-package.ps1 come from
    methodica-science-mass-gas-01 (byte-identical to liquid-02's) — only this file is unit-specific:

      1. The component glob is locked to methodica-science-mass-density-01-NN.
      2. The sub-app rule covers the applet/ folder of parts 01 and 02 (applet.js, applet2.js,
         applet.css, images/*.png), loaded by the part's own index.html — not an <iframe> site, but
         the same allowlist shape: named files at depth 3, one image folder below.
      3. scripts/ (serve.py) is excluded at the top level; .py is excluded by extension too.

    Shared code lives in unit-js/ (10/20/25/40/50/90 + 05-media.js + 05-motion.js), unit-css/
    (25-report.css, motion.css), unit-assets/ (fonts, icons, two clips).

    It ships NO root files (rule set 28.09.26 for all 720 units; Documentation/
    reporting-and-resume/ADDING-REPORTING-AND-RESUME.md §5.2). Platforms launch every component
    by its own .../<component>/index.html link — Kata's hostedContentRef — so a unit-level entry
    point is never used, and the MOE CDN serves a folder URL as 0 bytes.
#>

# ── Directories that never contribute a single file, whatever is inside them ──
$ExcludeTopLevel = @('_test', 'docs-and-tools', 'metadata-from', 'scripts', 'deployments', '.git', '.claude')

# ── File names that never ship, wherever they appear ──
#    ARCHITECTURE.md / PROJECT_BRIEF.md / HOWTO-720-REPORTING.md are already refused by
#    the $ComponentFiles and $RootFiles rules below; naming them is defence in depth and
#    documents the intent for whoever adds the next document.
$ExcludeNames = @('index_dev.html', 'README.md', '.gitignore', '.gitattributes', '.DS_Store', 'Thumbs.db', 'desktop.ini', 'kata-api-key.txt')

# ── Extensions that never ship ──
#    .xlf = a translation export, if one is ever placed at the repo root.
$ExcludeExt = @('.ps1', '.log', '.xlf', '.md', '.py')

# ── Any path segment starting with an underscore is a SOURCE, not a deliverable. ──
$ExcludeUnderscoreSegment = $true

# ── Directory names that are source material wherever they appear, even inside assets/ ──
#    originals/ holds pre-edit copies of avatar and scene images — 12 files, 19 MB across
#    the five components, referenced by nothing. Verified by grepping every filename under
#    it against all html/js/css in the unit: zero hits. The only mention of the word
#    anywhere is a COMMENT in 03-02/script.js:177 recording where a source was kept, not a
#    code path that builds the URL.
$ExcludeDirSegment = @()                  # no source folders inside the shipping trees (the producer's raw media is untracked)

# ── Individual files that look shippable and are not ─────────────────────────
#    Every one verified by grep across all html/js/css in the unit. This is safe to assert
#    because neither the sub-app nor the components build these particular names
#    dynamically: PLANE_IMAGES (plane-mass-simulation/script.js:17-24) is a static literal
#    map, and the components' preloader builds only '-come-in.mp4' / '-questioning.mp4' /
#    '-clapping-hands.mp4' — never the .png twins listed here.
#
#    ⚠️ Do NOT extend this list by eye. An asset that merely looks unused may be built at
#    runtime from a colour or a screen number; a missing image costs more than its bytes.
$ExcludeRelPaths = @(
    # Empty: every asset in the parts and unit-assets/ is referenced (_test/verify-assets.js, orphan check).
)

# ── What each shipped area contributes ──
$RootFiles = @()                         # none — the root index.html is not deployed (see .NOTES)

$UnitDirs = @{
    'metadata'    = '*.json'             # unit + per-component catalogue records
    'unit-js'     = '*.js'               # the shared layer (its README.md excluded above)
    'unit-css'    = '*.css'              # 25-report.css, the shared issue-report modal
    'unit-assets' = '*'                  # fonts/images/video shared by more than one component
}

# Inside a component folder: these files, plus everything under assets/.
$ComponentFiles = @('index.html', 'script.js', 'styles.css')
$ComponentGlob  = 'methodica-science-mass-density-01-[0-9][0-9]'

# ── Sub-apps: a self-contained site inside a component, loaded by <iframe> ───
#    A sub-app is a self-contained site inside a component, pulled in by <iframe>. It has
#    its own document, so its relative paths resolve from ITS directory rather than the
#    component's, which is why it needs its own file list. (Note style.css would be
#    SINGULAR there — the components use styles.css.)
#    This unit: parts 01 and 02 keep an applet/ folder (the graph / lab simulations) with
#    applet.js (+ applet2.js in part 01), applet.css and images/*.png, all loaded from the part's
#    own index.html — so they resolve from the part folder, but the allowlist shape is the same.
$ComponentSubApps = @('applet')
$SubAppFiles      = @('applet.js', 'applet2.js', 'applet.css')
$SubAppDirs       = @('images')

# ── Hygiene: if any of these turn up INSIDE a package, it is unsafe to upload ──
$SecretPatterns = @('*key*', '*.ps1', '*.log', 'index_dev.html', 'README.md', '.git*', '_*')

# ── Files a package may contain that are NOT copied from the tree ──
$PackageOnlyFiles = @('DEPLOY.md')

<#
.SYNOPSIS
    Does this repo-relative path (forward slashes) belong in a deployment package?
#>
function Test-Ships([string] $rel) {
    $segs = $rel.Split('/')
    if ($rel -in $ExcludeRelPaths)                     { return $false }
    if ($segs[0] -in $ExcludeTopLevel)                 { return $false }
    if ($segs[-1] -in $ExcludeNames)                   { return $false }
    if ([IO.Path]::GetExtension($rel) -in $ExcludeExt) { return $false }
    if ($ExcludeUnderscoreSegment -and ($segs | Where-Object { $_.StartsWith('_') })) { return $false }
    if ($segs | Where-Object { $_ -in $ExcludeDirSegment }) { return $false }

    if ($segs.Count -eq 1) { return $segs[0] -in $RootFiles }

    if ($UnitDirs.ContainsKey($segs[0])) {
        $glob = $UnitDirs[$segs[0]]
        if ($glob -eq '*') { return $true }              # unit-assets/: everything, at any depth
        return ($segs.Count -eq 2 -and $segs[1] -like $glob)
    }

    if ($segs[0] -like $ComponentGlob) {
        if ($segs.Count -eq 2) { return $segs[1] -in $ComponentFiles }
        if ($segs[1] -eq 'assets') { return $true }      # assets/ at any depth
        if ($segs[1] -in $ComponentSubApps) {
            if ($segs.Count -eq 3) { return $segs[2] -in $SubAppFiles }
            return ($segs[2] -in $SubAppDirs)            # the sub-app's own images/ or assets/, any depth
        }
        return $false
    }
    return $false
}

<#
.SYNOPSIS
    Every repo-relative path in $root that ships, sorted.
#>
function Get-ShippableFiles([string] $root) {
    Get-ChildItem -LiteralPath $root -Recurse -File -Force |
        ForEach-Object { [IO.Path]::GetRelativePath($root, $_.FullName).Replace('\', '/') } |
        Where-Object { Test-Ships $_ } |
        Sort-Object
}

<#
.SYNOPSIS
    Secret/dev files present in a package. Anything returned makes it unsafe to upload.
#>
function Get-HygieneHits([string[]] $rels) {
    $hits = @()
    foreach ($pat in $SecretPatterns) {
        $hits += @($rels | Where-Object {
            $_.Split('/')[-1] -like $pat -or ($_.Split('/') | Where-Object { $_ -like $pat })
        })
    }
    @($hits | Sort-Object -Unique | Where-Object { $_ -notin $PackageOnlyFiles })
}
