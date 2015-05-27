using System.Text;

namespace EncodingNETBridge
{
    public sealed class Bridge
    {
        public static bool checkExistence(string name)
        {
            try
            {
                var encoding = Encoding.GetEncoding(name);
                return true;
            }
            catch
            {
                return false;
            }
        }

        public static byte[] convert(string from, string to,
        [System.Runtime.InteropServices.WindowsRuntime.WriteOnlyArray] byte[] bytes)
        {
            var fromEncoding = Encoding.GetEncoding(from);
            var toEncoding = Encoding.GetEncoding(to);
            return Encoding.Convert(fromEncoding, toEncoding, bytes);
        }
    }
}
