Add-Type -AssemblyName System.Drawing

function Create-DropLyncIcon($size, $path, $maskable) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

    # Background
    $rect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(11, 15, 29), [System.Drawing.Color]::FromArgb(6, 9, 18), 45)
    $g.FillRectangle($bgBrush, $rect)

    if (-not $maskable) {
        $cornerPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 255, 255, 255), [int]($size * 0.015))
        $g.DrawRectangle($cornerPen, 2, 2, $size - 4, $size - 4)
    }

    # Center prism coordinates
    $center = $size / 2
    $prismW = $size * 0.46
    $prismH = $size * 0.46

    # Glow underlay
    $glowR = $size * 0.28
    $glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(45, 37, 99, 235))
    $g.FillEllipse($glowBrush, $center - $glowR, $center - $glowR + $prismH * 0.1, $glowR * 2, $glowR * 2)

    # Top face
    $topPts = @(
        (New-Object System.Drawing.PointF($center, $center - $prismH * 0.5)),
        (New-Object System.Drawing.PointF($center + $prismW * 0.48, $center - $prismH * 0.18)),
        (New-Object System.Drawing.PointF($center, $center + $prismH * 0.15)),
        (New-Object System.Drawing.PointF($center - $prismW * 0.48, $center - $prismH * 0.18))
    )
    $topBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(56, 189, 248))
    $g.FillPolygon($topBrush, $topPts)

    # Left face
    $leftPts = @(
        (New-Object System.Drawing.PointF($center - $prismW * 0.48, $center - $prismH * 0.18)),
        (New-Object System.Drawing.PointF($center, $center + $prismH * 0.15)),
        (New-Object System.Drawing.PointF($center, $center + $prismH * 0.65)),
        (New-Object System.Drawing.PointF($center - $prismW * 0.48, $center + $prismH * 0.32))
    )
    $leftBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
    $g.FillPolygon($leftBrush, $leftPts)

    # Right face
    $rightPts = @(
        (New-Object System.Drawing.PointF($center, $center + $prismH * 0.15)),
        (New-Object System.Drawing.PointF($center + $prismW * 0.48, $center - $prismH * 0.18)),
        (New-Object System.Drawing.PointF($center + $prismW * 0.48, $center + $prismH * 0.32)),
        (New-Object System.Drawing.PointF($center, $center + $prismH * 0.65))
    )
    $rightBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(2, 132, 199))
    $g.FillPolygon($rightBrush, $rightPts)

    # Center beam line
    $laserPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(200, 255, 255, 255), [int]($size * 0.035))
    $g.DrawLine($laserPen, $center, $center - $prismH * 0.4, $center, $center + $prismH * 0.55)

    # Central quantum core
    $coreR = $size * 0.05
    $coreBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255))
    $g.FillEllipse($coreBrush, $center - $coreR, $center + $prismH * 0.15 - $coreR, $coreR * 2, $coreR * 2)

    $cyanR = $size * 0.028
    $cyanBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0, 242, 254))
    $g.FillEllipse($cyanBrush, $center - $cyanR, $center + $prismH * 0.15 - $cyanR, $cyanR * 2, $cyanR * 2)

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created $path ($size x $size)"
}

function Create-DropLyncScreenshot($width, $height, $path, $isMobile) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    $rect = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, [System.Drawing.Color]::FromArgb(6, 9, 18), [System.Drawing.Color]::FromArgb(15, 23, 42), 90)
    $g.FillRectangle($bgBrush, $rect)

    # Decorative header
    $headerBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255))
    $fontTitle = New-Object System.Drawing.Font("Arial", [int]($width * 0.035), [System.Drawing.FontStyle]::Bold)
    $fontSub = New-Object System.Drawing.Font("Arial", [int]($width * 0.018), [System.Drawing.FontStyle]::Regular)

    $g.DrawString("DropLync — Send 10GB Files Securely", $fontTitle, $headerBrush, [int]($width * 0.08), [int]($height * 0.12))
    $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(148, 163, 184))
    $g.DrawString("Fast, private 256-bit encrypted transfers with auto-expiration", $fontSub, $subBrush, [int]($width * 0.08), [int]($height * 0.19))

    # Center card mockup
    $cardW = [int]($width * 0.84)
    $cardH = [int]($height * 0.58)
    $cardX = [int]($width * 0.08)
    $cardY = [int]($height * 0.28)

    $cardBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(18, 24, 38))
    $g.FillRectangle($cardBrush, $cardX, $cardY, $cardW, $cardH)

    $cardBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(37, 99, 235), 3)
    $g.DrawRectangle($cardBorder, $cardX, $cardY, $cardW, $cardH)

    # Button inside mockup
    $btnW = [int]($cardW * 0.6)
    $btnH = [int]($cardH * 0.18)
    $btnX = $cardX + [int](($cardW - $btnW) / 2)
    $btnY = $cardY + [int]($cardH * 0.65)

    $btnBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(37, 99, 235))
    $g.FillRectangle($btnBrush, $btnX, $btnY, $btnW, $btnH)

    $btnFont = New-Object System.Drawing.Font("Arial", [int]($btnH * 0.32), [System.Drawing.FontStyle]::Bold)
    $g.DrawString("Send Files (10GB Free)", $btnFont, $headerBrush, $btnX + [int]($btnW * 0.14), $btnY + [int]($btnH * 0.3))

    $g.Dispose()
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    Write-Host "Created Screenshot $path ($width x $height)"
}

Create-DropLyncIcon 192 "public\icon-192.png" $false
Create-DropLyncIcon 192 "public\icon-maskable-192.png" $true
Create-DropLyncIcon 512 "public\icon-512.png" $false
Create-DropLyncIcon 512 "public\icon-maskable-512.png" $true

Create-DropLyncScreenshot 750 1334 "public\screenshot-mobile.png" $true
Create-DropLyncScreenshot 1280 800 "public\screenshot-desktop.png" $false
