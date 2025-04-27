// @ts-ignore
export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
export const isAndroid = () => /android/i.test(navigator.userAgent);
export const isMacOS = () => /Macintosh|Mac|Mac OS|MacIntel|MacPPC|Mac68K/gi.test(navigator.userAgent);
export const isWindows = () => /Win32|Win64|Windows|Windows NT|WinCE/gi.test(navigator.userAgent);
export const isChromeOS = () => /CrOS/gi.test(navigator.userAgent);
export const isLinux = () => /Linux/gi.test(navigator.userAgent);
export const getBrowser = () => {
    const { userAgent } = navigator;

    return userAgent.match(/edg/i) ? 'edge' :
        userAgent.match(/chrome|chromium|crios/i) ? 'chrome' :
            userAgent.match(/firefox|fxios/i) ? 'firefox' :
                userAgent.match(/safari/i) ? 'safari' :
                    userAgent.match(/opr\//i) ? 'opera' :
                        userAgent.match(/android/i) ? 'android' :
                            userAgent.match(/iphone/i) ? 'iphone' : 'unknown';
}

export const getPlatform = () => {
    return isIOS() ? 'ios' :
        isAndroid() ? 'android' :
            isMacOS() ? 'macos' :
                isChromeOS() ? 'chromeos' :
                    isWindows() ? 'windows' :
                        isLinux() ? 'linux' : 'unknown';
}
export const isTouchScreen = () => {
    return navigator.maxTouchPoints && navigator.maxTouchPoints > 0 ||
        window.matchMedia && window.matchMedia("(any-pointer:coarse)").matches;
};
export const isOffline = () => 'onLine' in navigator && !navigator.onLine;


export const isChrome = () => getBrowser() === 'chrome';
export const isFirefox = () => getBrowser() === 'firefox';
export const isSafari = () => getBrowser() === 'safari';
export const isOpera = () => getBrowser() === 'opera';
export const isEdge = () => getBrowser() === 'edge';
export const isIOSSafari = () => getBrowser() === 'safari' && isIOS();
export const isIOSChrome = () => getBrowser() === 'chrome' && isIOS();
export const isAndroidChrome = () => getBrowser() === 'chrome' && isAndroid();
export const isMacOSChrome = () => getBrowser() === 'chrome' && isMacOS();
export const isWindowsChrome = () => getBrowser() === 'chrome' && isWindows();
export const isIOSFirefox = () => getBrowser() === 'firefox' && isIOS();
export const isAndroidFirefox = () => getBrowser() === 'firefox' && isAndroid();
export const isIOSEdge = () => getBrowser() === 'edge' && isIOS();
export const isAndroidEdge = () => getBrowser() === 'edge' && isAndroid();
export const isMacOSEdge = () => getBrowser() === 'edge' && isMacOS();
export const isWindowsEdge = () => getBrowser() === 'edge' && isWindows();
export const isIOSOpera = () => getBrowser() === 'opera' && isIOS();
export const isAndroidOpera = () => getBrowser() === 'opera' && isAndroid();

export const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches;

export const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes == 0) {
        return '0 Bytes';
    }

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}



