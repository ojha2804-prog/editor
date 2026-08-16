using System;
using System.Globalization;
using System.Reflection;

namespace ExportFlatPatternDXF
{
    static class Com
    {
        const BindingFlags Flags = BindingFlags.Instance | BindingFlags.Public | BindingFlags.InvokeMethod |
                                   BindingFlags.GetProperty | BindingFlags.SetProperty;

        public static object Call(object target, string name, params object[] args)
        {
            if (target == null) return null;
            return target.GetType().InvokeMember(name, Flags | BindingFlags.InvokeMethod, null, target, args);
        }

        public static object Get(object target, string name)
        {
            if (target == null) return null;
            return target.GetType().InvokeMember(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.GetProperty, null, target, null);
        }

        public static void Set(object target, string name, object value)
        {
            if (target == null) return;
            target.GetType().InvokeMember(name, BindingFlags.Instance | BindingFlags.Public | BindingFlags.SetProperty, null, target, new[] { value });
        }

        public static int AsInt(object v)
        {
            if (v == null || v is DBNull) return 0;
            return Convert.ToInt32(v, CultureInfo.InvariantCulture);
        }

        public static string AsStr(object v)
        {
            return v == null ? "" : Convert.ToString(v, CultureInfo.InvariantCulture);
        }

        public static object Member(object target, string name, params object[] args)
        {
            if (target == null) return null;
            if (args == null || args.Length == 0)
            {
                try { return Get(target, name); } catch { }
                try { return Call(target, name); } catch { }
                return null;
            }
            return Call(target, name, args);
        }

        public static bool TryCall(object target, string name, out object result, params object[] args)
        {
            result = null;
            try
            {
                result = Call(target, name, args);
                return true;
            }
            catch
            {
                return false;
            }
        }
    }
}
