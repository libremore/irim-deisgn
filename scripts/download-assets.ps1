$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$origin = 'https://www.irimdesign.co.kr'
$assets = @(
    @{ Source = "$origin/image/main/main_vis01.jpg"; Target = 'assets/images/main-01.jpg' },
    @{ Source = "$origin/image/main/main_vis03.jpg"; Target = 'assets/images/main-03.jpg' },
    @{ Source = "$origin/image/main/main_vis04.jpg"; Target = 'assets/images/main-04.jpg' },
    @{ Source = "$origin/image/main/main_vis05.jpg"; Target = 'assets/images/main-05.jpg' },
    @{ Source = "$origin/image/main/main_vis06.jpg"; Target = 'assets/images/main-06.jpg' },
    @{ Source = "$origin/image/main/main_vis07.jpg"; Target = 'assets/images/main-07.jpg' },
    @{ Source = "$origin/image/main/main_vis08.jpg"; Target = 'assets/images/main-08.jpg' },
    @{ Source = "$origin/image/main/main_vis09.jpg"; Target = 'assets/images/main-09.jpg' },
    @{ Source = "$origin/image/top/logo.png"; Target = 'assets/images/logo.png' },
    @{ Source = "$origin/image/sub/brand_img02.jpg"; Target = 'assets/images/brand.jpg' },
    @{ Source = "$origin/image/sub/sub_body_bg01.jpg"; Target = 'assets/images/background.jpg' },
    @{ Source = "$origin/fonts/Pretendard-ExtraLight.woff2"; Target = 'assets/fonts/Pretendard-ExtraLight.woff2' },
    @{ Source = "$origin/fonts/Pretendard-Light.woff2"; Target = 'assets/fonts/Pretendard-Light.woff2' },
    @{ Source = "$origin/fonts/Pretendard-Regular.woff2"; Target = 'assets/fonts/Pretendard-Regular.woff2' },
    @{ Source = "$origin/fonts/Pretendard-SemiBold.woff2"; Target = 'assets/fonts/Pretendard-SemiBold.woff2' },
    @{ Source = "$origin/fonts/Pretendard-Bold.woff2"; Target = 'assets/fonts/Pretendard-Bold.woff2' },
    @{ Source = "$origin/fonts/xeicon.woff2"; Target = 'assets/fonts/xeicon.woff2' },
    @{ Source = 'https://fastly.jsdelivr.net/gh/projectnoonnu/noonfonts_2201-2@1.0/GangwonEdu_OTFBoldA.woff'; Target = 'assets/fonts/GangwonEdu.woff' },
    @{ Source = 'https://fonts.gstatic.com/l/font?kit=-nFuOG829Oofr2wohFbTp9ifNAn722rq0MXz76Cy_CpWtIgrLjNVPw&skey=3904269dc8bdd0a1&v=v40'; Target = 'assets/fonts/NotoSansTC-Han.ttf' },
    @{ Source = "$origin/css/swiper-bundle.css"; Target = 'assets/vendor/swiper-bundle.css' },
    @{ Source = "$origin/js/swiper-bundle.min.js"; Target = 'assets/vendor/swiper-bundle.min.js' }
)

foreach ($asset in $assets) {
    $destination = Join-Path $projectRoot $asset.Target
    if ((Test-Path -LiteralPath $destination) -and (Get-Item -LiteralPath $destination).Length -gt 0) {
        Write-Output "Exists: $($asset.Target)"
        continue
    }
    $null = New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination)
    for ($attempt = 1; $attempt -le 3; $attempt++) {
        try {
            Invoke-WebRequest -Uri $asset.Source -OutFile $destination -UseBasicParsing -TimeoutSec 30
            Write-Output "Downloaded: $($asset.Target) ($((Get-Item -LiteralPath $destination).Length) bytes)"
            break
        } catch {
            if ($attempt -eq 3) { throw }
            Write-Output "Retry $attempt : $($asset.Target)"
        }
    }
}
