param(
  [Parameter(Mandatory=$true)]
  [string]$PrinterName,

  [Parameter(Mandatory=$true)]
  [string]$FilePath
)

if (!(Test-Path $FilePath)) {
  throw "No existe el archivo a imprimir: $FilePath"
}

$source = @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper
{
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public class DOCINFOA
  {
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDocName;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pOutputFile;
    [MarshalAs(UnmanagedType.LPStr)]
    public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool OpenPrinter(string szPrinter, out IntPtr hPrinter, IntPtr pd);

  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool ClosePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterA", SetLastError = true, CharSet = CharSet.Ansi, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOA di);

  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);

  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, Int32 dwCount, out Int32 dwWritten);

  public static bool SendBytesToPrinter(string printerName, byte[] bytes)
  {
    IntPtr hPrinter;
    DOCINFOA di = new DOCINFOA();
    di.pDocName = "UWA Comanda";
    di.pDataType = "RAW";

    bool success = false;

    if (OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
    {
      if (StartDocPrinter(hPrinter, 1, di))
      {
        if (StartPagePrinter(hPrinter))
        {
          int written;
          success = WritePrinter(hPrinter, bytes, bytes.Length, out written);
          EndPagePrinter(hPrinter);
        }

        EndDocPrinter(hPrinter);
      }

      ClosePrinter(hPrinter);
    }

    return success;
  }
}
"@

Add-Type -TypeDefinition $source -Language CSharp

[byte[]]$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$ok = [RawPrinterHelper]::SendBytesToPrinter($PrinterName, $bytes)

if (-not $ok) {
  throw "No se pudo enviar impresion RAW a la impresora: $PrinterName"
}

Write-Host "Impresion enviada a $PrinterName"
