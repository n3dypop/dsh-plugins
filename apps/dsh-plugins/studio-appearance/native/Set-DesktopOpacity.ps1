# DSH Desktop Windows-only native window opacity. This helper accepts no PID,
# handle, path, or window title from its caller. It fails closed when ownership
# or a single application window cannot be established.
param([Parameter(Mandatory=$true)][ValidateRange(30,100)][int]$Percent)
$ErrorActionPreference = 'Stop'
if ([Environment]::OSVersion.Platform -ne [PlatformID]::Win32NT -or $env:ELECTRON_RUN_AS_NODE -ne '1') { throw 'Desktop host unavailable.' }

Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Runtime.InteropServices;
using System.Text;
public static class DshOpacityNative {
    public const int GWL_EXSTYLE=-20;
    public const long WS_EX_LAYERED=0x00080000L;
    public const uint LWA_ALPHA=2;
    const uint TH32CS_SNAPPROCESS=2, GW_OWNER=4;
    const string Marker="n3dypop.dsh-plugins.opacity.v1";
    [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)]
    struct PROCESSENTRY32 {
        public uint dwSize, cntUsage, th32ProcessID;
        public UIntPtr th32DefaultHeapID;
        public uint th32ModuleID, cntThreads, th32ParentProcessID;
        public int pcPriClassBase;
        public uint dwFlags;
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst=260)] public string szExeFile;
    }
    delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lparam);
    [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr CreateToolhelp32Snapshot(uint flags,uint pid);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool Process32FirstW(IntPtr snapshot,ref PROCESSENTRY32 entry);
    [DllImport("kernel32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern bool Process32NextW(IntPtr snapshot,ref PROCESSENTRY32 entry);
    [DllImport("kernel32.dll",SetLastError=true)] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")] static extern void SetLastError(uint error);
    [DllImport("user32.dll",SetLastError=true)] static extern bool EnumWindows(EnumWindowsProc callback,IntPtr param);
    [DllImport("user32.dll",SetLastError=true)] static extern uint GetWindowThreadProcessId(IntPtr hwnd,out uint pid);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool IsWindow(IntPtr hwnd);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hwnd,uint command);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassNameW(IntPtr hwnd,StringBuilder result,int capacity);
    [DllImport("user32.dll",SetLastError=true)] static extern IntPtr GetWindowLongPtrW(IntPtr hwnd,int index);
    [DllImport("user32.dll",SetLastError=true)] static extern IntPtr SetWindowLongPtrW(IntPtr hwnd,int index,IntPtr value);
    [DllImport("user32.dll",SetLastError=true)] static extern bool SetLayeredWindowAttributes(IntPtr hwnd,uint key,byte alpha,uint flags);
    [DllImport("user32.dll",SetLastError=true)] static extern bool GetLayeredWindowAttributes(IntPtr hwnd,out uint key,out byte alpha,out uint flags);
    [DllImport("user32.dll",SetLastError=true,CharSet=CharSet.Unicode)] static extern bool SetPropW(IntPtr hwnd,string name,IntPtr value);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr GetPropW(IntPtr hwnd,string name);
    [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr RemovePropW(IntPtr hwnd,string name);
    public static uint Parent(uint pid) {
        IntPtr snap=CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS,0);
        if(snap==new IntPtr(-1))throw new Win32Exception(Marshal.GetLastWin32Error());
        try { var e=new PROCESSENTRY32();e.dwSize=(uint)Marshal.SizeOf(typeof(PROCESSENTRY32));
            if(!Process32FirstW(snap,ref e))throw new Win32Exception(Marshal.GetLastWin32Error());
            do { if(e.th32ProcessID==pid)return e.th32ParentProcessID; } while(Process32NextW(snap,ref e));
            throw new InvalidOperationException("Process ancestry unavailable.");
        } finally { CloseHandle(snap); }
    }
    public static IntPtr[] Windows(uint expectedPid) {
        var windows=new List<IntPtr>();
        if(!EnumWindows((h,p)=>{uint owner; if(GetWindowThreadProcessId(h,out owner)==0 || owner!=expectedPid || !IsWindowVisible(h) || GetWindow(h,GW_OWNER)!=IntPtr.Zero)return true;
            var name=new StringBuilder(256);if(GetClassNameW(h,name,name.Capacity)>0 && name.ToString()=="Chrome_WidgetWin_1")windows.Add(h);return true;},IntPtr.Zero))throw new Win32Exception(Marshal.GetLastWin32Error());
        return windows.ToArray();
    }
    static long Style(IntPtr hwnd) { SetLastError(0);IntPtr v=GetWindowLongPtrW(hwnd,GWL_EXSTYLE);int e=Marshal.GetLastWin32Error();if(v==IntPtr.Zero&&e!=0)throw new Win32Exception(e);return v.ToInt64(); }
    static void Style(IntPtr hwnd,long value) { SetLastError(0);IntPtr v=SetWindowLongPtrW(hwnd,GWL_EXSTYLE,new IntPtr(value));int e=Marshal.GetLastWin32Error();if(v==IntPtr.Zero&&e!=0)throw new Win32Exception(e); }
    public static void Apply(IntPtr hwnd,uint expectedPid,int percent) {
        uint owner;if(!IsWindow(hwnd)||!IsWindowVisible(hwnd)||GetWindowThreadProcessId(hwnd,out owner)==0||owner!=expectedPid)throw new InvalidOperationException("Window owner changed.");
        var name=new StringBuilder(256);if(GetWindow(hwnd,GW_OWNER)!=IntPtr.Zero||GetClassNameW(hwnd,name,name.Capacity)==0||name.ToString()!="Chrome_WidgetWin_1")throw new InvalidOperationException("Window identity changed.");
        long before=Style(hwnd);bool marked=GetPropW(hwnd,Marker)==new IntPtr(1),layered=(before&WS_EX_LAYERED)!=0;
        if(layered&&!marked)throw new InvalidOperationException("Existing transparency is not owned by this helper.");
        if(percent==100) {
            if(marked) {
                if(layered)Style(hwnd,before&~WS_EX_LAYERED);
                if((Style(hwnd)&WS_EX_LAYERED)!=0 || RemovePropW(hwnd,Marker)!=new IntPtr(1))throw new InvalidOperationException("Opaque restoration could not be verified.");
            }
            return;
        }
        bool added=false;
        try {
            if(!marked) { if(!SetPropW(hwnd,Marker,new IntPtr(1)))throw new Win32Exception(Marshal.GetLastWin32Error());added=true; }
            if(!layered)Style(hwnd,before|WS_EX_LAYERED);
            byte alpha=(byte)Math.Round(percent*255.0/100.0,MidpointRounding.AwayFromZero);
            if(!SetLayeredWindowAttributes(hwnd,0,alpha,LWA_ALPHA))throw new Win32Exception(Marshal.GetLastWin32Error());
            uint key,flags;byte actual;
            if((Style(hwnd)&WS_EX_LAYERED)==0 || !GetLayeredWindowAttributes(hwnd,out key,out actual,out flags) || (flags&LWA_ALPHA)==0 || actual!=alpha)throw new InvalidOperationException("Opacity could not be verified.");
        } catch {
            if(added) {
                // Keep ownership if rollback cannot be proven. Otherwise a
                // later 100% recovery would mistake our own layered style for
                // somebody else's and refuse to clear it.
                bool restored=false;
                try { long current=Style(hwnd);if((current&WS_EX_LAYERED)!=0)Style(hwnd,current&~WS_EX_LAYERED);restored=(Style(hwnd)&WS_EX_LAYERED)==0; } catch {}
                if(restored)RemovePropW(hwnd,Marker);
            }
            throw;
        }
    }
}
'@

# Dot-sourcing is used only by the isolated, self-owned native-window fixture.
# Normal product invocation always uses -File and performs the checks below.
if ($MyInvocation.InvocationName -eq '.') { return }

function Process-Identity([uint32]$ProcessId) {
    $process = Get-Process -Id $ProcessId -ErrorAction Stop
    try {
        $path = $process.MainModule.FileName
        if (-not $path -or [IO.Path]::GetFileName($path) -ine 'DeepSeek Harness.exe') { throw 'Unexpected Desktop process.' }
        return [pscustomobject]@{ Id=$process.Id; Path=[IO.Path]::GetFullPath($path); Started=$process.StartTime.ToUniversalTime().Ticks }
    } finally { $process.Dispose() }
}

$hostId = [DshOpacityNative]::Parent([uint32]$PID)
$mainId = [DshOpacityNative]::Parent($hostId)
if ($hostId -le 0 -or $mainId -le 0 -or $hostId -eq $mainId) { throw 'Desktop process ancestry unavailable.' }
$hostIdentity = Process-Identity $hostId
$mainIdentity = Process-Identity $mainId
if ($hostIdentity.Path -ine $mainIdentity.Path -or $mainIdentity.Started -gt $hostIdentity.Started) { throw 'Desktop process identity differs.' }
$mutex = [Threading.Mutex]::new($false, ('Local\n3dypop-dsh-opacity-' + $mainIdentity.Id + '-' + $mainIdentity.Started))
$held = $false
try {
    try { $held=$mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $held=$true; throw 'Previous opacity operation was interrupted.' }
    if (-not $held) { throw 'Another opacity operation is in progress.' }
    $windows = @([DshOpacityNative]::Windows($mainId))
    if ($windows.Count -ne 1) { throw "Desktop main window is absent or ambiguous (count: $($windows.Count))." }
    $hostNow=Process-Identity $hostId
    $mainNow=Process-Identity $mainId
    if ($hostNow.Started -ne $hostIdentity.Started -or $mainNow.Started -ne $mainIdentity.Started -or $hostNow.Path -ine $mainNow.Path -or [DshOpacityNative]::Parent($hostId) -ne $mainId -or [DshOpacityNative]::Parent([uint32]$PID) -ne $hostId) { throw 'Desktop process changed.' }
    $again=@([DshOpacityNative]::Windows($mainId))
    if($again.Count -ne 1 -or $again[0] -ne $windows[0]) { throw 'Desktop window changed.' }
    [DshOpacityNative]::Apply($windows[0],$mainId,$Percent)
    [pscustomobject]@{status='applied';percent=$Percent}|ConvertTo-Json -Compress
} finally {
    if($held){$mutex.ReleaseMutex()}
    $mutex.Dispose()
}
