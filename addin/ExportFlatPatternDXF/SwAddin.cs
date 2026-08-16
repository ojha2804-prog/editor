using System;
using System.ComponentModel;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Win32;
using SolidWorks.Interop.swpublished;

namespace ExportFlatPatternDXF
{
    [ComVisible(true)]
    [Guid("8f3c2a91-4e6b-4c1d-9a7e-1b5d8f0c3e27")]
    [ClassInterface(ClassInterfaceType.AutoDual)]
    [DisplayName("Export Flat Pattern DXF")]
    [Description("Batch-export SOLIDWORKS sheet-metal flat patterns as laser DXF into the SWOOD report folder.")]
    public class SwAddin : ISwAddin
    {
        const int CmdGroupId = 1;
        const int CmdExportId = 1;
        const int SwMenuItem = 1;
        const int SwToolbarItem = 2;

        object _swApp;
        int _cookie;
        object _cmdGroup;
        AddinSettings _settings;

        public bool ConnectToSW(object ThisSW, int Cookie)
        {
            _swApp = ThisSW;
            _cookie = Cookie;
            _settings = AddinSettings.Load(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location));

            if (!Com.TryCall(_swApp, "SetAddinCallbackInfo2", out _, 0, this, Cookie))
                Com.Call(_swApp, "SetAddinCallbackInfo", 0, this, Cookie);

            AddCommandMgr();
            return true;
        }

        public bool DisconnectFromSW()
        {
            RemoveCommandMgr();
            if (_swApp != null)
            {
                Marshal.ReleaseComObject(_swApp);
                _swApp = null;
            }
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
            GC.WaitForPendingFinalizers();
            return true;
        }

        /// <summary>Command-manager callback name. Do not rename without updating AddCommandItem2.</summary>
        public void ExportFlatPattern()
        {
            try
            {
                _settings = AddinSettings.Load(Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location));
                ExportService.Run(_swApp, _settings);
            }
            catch (Exception ex)
            {
                MessageBox.Show(ex.ToString(), "Export Flat Pattern DXF", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        /// <summary>1 = enabled when a part or assembly is active.</summary>
        public int EnableExport()
        {
            try
            {
                var doc = Com.Get(_swApp, "ActiveDoc");
                if (doc == null) return 0;
                var t = Com.AsInt(Com.Call(doc, "GetType"));
                return (t == 1 || t == 2) ? 1 : 0;
            }
            catch
            {
                return 0;
            }
        }

        void AddCommandMgr()
        {
            try
            {
                var cmdMgr = Com.Call(_swApp, "GetCommandManager", _cookie);
                var errors = 0;
                object group = null;
                if (!Com.TryCall(cmdMgr, "CreateCommandGroup2", out group,
                        CmdGroupId, "Flat Pattern DXF", "Export sheet-metal flat patterns as DXF",
                        "True flat-pattern DXF for laser cutting (SWOOD report folder)", 0, true, errors))
                {
                    Com.TryCall(cmdMgr, "CreateCommandGroup", out group, CmdGroupId, "Flat Pattern DXF", "", "", 0);
                }
                _cmdGroup = group;
                if (_cmdGroup == null) return;

                var dir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location) ?? "";
                var icon20 = Path.Combine(dir, "Resources", "toolbar20.bmp");
                var icon32 = Path.Combine(dir, "Resources", "toolbar32.bmp");
                try { Com.Set(_cmdGroup, "IconList", icon20); } catch { }
                try { Com.Set(_cmdGroup, "MainIconList", icon32); } catch { }

                Com.Call(_cmdGroup, "AddCommandItem2",
                    "Export Flat Pattern DXF", -1,
                    "Export every sheet-metal part as a true flat-pattern DXF",
                    "Export Flat Pattern DXF",
                    0, "ExportFlatPattern", "EnableExport", CmdExportId,
                    SwMenuItem + SwToolbarItem);

                Com.Set(_cmdGroup, "HasToolbar", true);
                Com.Set(_cmdGroup, "HasMenu", true);
                Com.Call(_cmdGroup, "Activate");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("Command manager: " + ex.Message);
            }
        }

        void RemoveCommandMgr()
        {
            try
            {
                var cmdMgr = Com.Call(_swApp, "GetCommandManager", _cookie);
                Com.Call(cmdMgr, "RemoveCommandGroup", CmdGroupId);
            }
            catch { }
            _cmdGroup = null;
        }

        const string AddinKeyTemplate = @"SOFTWARE\SolidWorks\Addins\{{{0}}}";
        const string StartupKeyTemplate = @"Software\SolidWorks\AddInsStartup\{{{0}}}";

        [ComRegisterFunction]
        public static void RegisterFunction(Type t)
        {
            try
            {
                var title = t.GetCustomAttributes(false).OfType<DisplayNameAttribute>().FirstOrDefault()?.DisplayName ?? t.Name;
                var desc = t.GetCustomAttributes(false).OfType<DescriptionAttribute>().FirstOrDefault()?.Description ?? t.Name;
                using (var key = Registry.LocalMachine.CreateSubKey(string.Format(AddinKeyTemplate, t.GUID)))
                {
                    key.SetValue(null, 0);
                    key.SetValue("Title", title);
                    key.SetValue("Description", desc);
                }
                using (var key = Registry.CurrentUser.CreateSubKey(string.Format(StartupKeyTemplate, t.GUID)))
                    key.SetValue(null, 1, RegistryValueKind.DWord);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Register add-in: " + ex.Message, "Export Flat Pattern DXF");
            }
        }

        [ComUnregisterFunction]
        public static void UnregisterFunction(Type t)
        {
            try { Registry.LocalMachine.DeleteSubKey(string.Format(AddinKeyTemplate, t.GUID), false); } catch { }
            try { Registry.CurrentUser.DeleteSubKey(string.Format(StartupKeyTemplate, t.GUID), false); } catch { }
        }
    }
}
