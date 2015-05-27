var FileOpenPicker = Windows.Storage.Pickers.FileOpenPicker;
var MessageDialog = Windows.UI.Popups.MessageDialog;
var UICommand = Windows.UI.Popups.UICommand;
var BasicProperties = Windows.Storage.FileProperties.BasicProperties;
var StorageFile = Windows.Storage.StorageFile;
var FileAccessMode = Windows.Storage.FileAccessMode;
var DataReader = Windows.Storage.Streams.DataReader;
var DataWriter = Windows.Storage.Streams.DataWriter;
document.addEventListener("DOMContentLoaded", function () {
    filePickerButton.addEventListener("click", function () {
        var picker = new FileOpenPicker();
        picker.fileTypeFilter.push("*");
        var files;
        Promise.resolve(picker.pickMultipleFilesAsync())
            .then(function (_files) {
            files = _files;
            if (!files.length)
                return;
            return Promise.all(files.map(function (file) { return file.getBasicPropertiesAsync(); }))
                .then(function (propertiesArray) {
                // 4 MiB check
                var containsBigFile = !!propertiesArray.filter(function (properties) { return properties.size > 4194304; }).length;
                var dialog;
                if (containsBigFile)
                    dialog = new MessageDialog("WARNING!!!\r\n\r\nOne of the file is bigger than 4MB. There is a possibility that there is the file which is not a text. Will you continue?");
                else
                    dialog = new MessageDialog("Conversion will be start immediately. Will you continue?");
                dialog.commands.push(new UICommand("Yes"));
                dialog.commands.push(new UICommand("No", null, "no"));
                return dialog.showAsync();
            })
                .then(function (result) {
                if (result.id === "no")
                    return;
                return Promise.all(files.map(function (file) { return file.openAsync(FileAccessMode.readWrite).then(function (stream) {
                    var reader = new DataReader(stream);
                    var writer = new DataWriter(stream);
                    var bytes = new Array(stream.size);
                    return reader.loadAsync(stream.size).then(function () {
                        reader.readBytes(bytes);
                        bytes = EncodingNETBridge.Bridge.convert("shift_jis", "utf-16", bytes);
                        reader.dispose();
                        stream.seek(0);
                        // TODO: insert BOM
                        writer.writeBytes(bytes);
                        return writer.storeAsync();
                    }).then(function () { return stream.close(); });
                }); })).then(function () { return new MessageDialog("Completed the conversion of " + files.length + " file(s)."); });
            });
        });
    });
});
/*
    http://msdn.microsoft.com/en-us/library/windows/apps/system.text.encoding.aspx
    var pr1 = document.querySelectorAll(".tableSection>table>tbody>tr>td:nth-of-type(1)>p");
    var pr2 = document.querySelectorAll(".tableSection>table>tbody>tr>td:nth-of-type(2)>p");
    var pr3 = document.querySelectorAll(".tableSection>table>tbody>tr>td:nth-of-type(3)>p");
    var str = "";
    for (var i = 0; i < pr1.length; i++) {
        str += `{ codePage: ${pr1[i].innerHTML.trim()}, name: "${pr2[i].innerHTML.trim()}", displayName: "${pr3[i].innerHTML.trim()}" },\r\n`;
    }
    console.log(str);
*/
var encodings = [
    { codePage: 37, name: "IBM037", displayName: "IBM EBCDIC (US-Canada)" },
    { codePage: 437, name: "IBM437", displayName: "OEM United States" },
    { codePage: 500, name: "IBM500", displayName: "IBM EBCDIC (International)" },
    { codePage: 708, name: "ASMO-708", displayName: "Arabic (ASMO 708)" },
    { codePage: 720, name: "DOS-720", displayName: "Arabic (DOS)" },
    { codePage: 737, name: "ibm737", displayName: "Greek (DOS)" },
    { codePage: 775, name: "ibm775", displayName: "Baltic (DOS)" },
    { codePage: 850, name: "ibm850", displayName: "Western European (DOS)" },
    { codePage: 852, name: "ibm852", displayName: "Central European (DOS)" },
    { codePage: 855, name: "IBM855", displayName: "OEM Cyrillic" },
    { codePage: 857, name: "ibm857", displayName: "Turkish (DOS)" },
    { codePage: 858, name: "IBM00858", displayName: "OEM Multilingual Latin I" },
    { codePage: 860, name: "IBM860", displayName: "Portuguese (DOS)" },
    { codePage: 861, name: "ibm861", displayName: "Icelandic (DOS)" },
    { codePage: 862, name: "DOS-862", displayName: "Hebrew (DOS)" },
    { codePage: 863, name: "IBM863", displayName: "French Canadian (DOS)" },
    { codePage: 864, name: "IBM864", displayName: "Arabic (864)" },
    { codePage: 865, name: "IBM865", displayName: "Nordic (DOS)" },
    { codePage: 866, name: "cp866", displayName: "Cyrillic (DOS)" },
    { codePage: 869, name: "ibm869", displayName: "Greek, Modern (DOS)" },
    { codePage: 870, name: "IBM870", displayName: "IBM EBCDIC (Multilingual Latin-2)" },
    { codePage: 874, name: "windows-874", displayName: "Thai (Windows)" },
    { codePage: 875, name: "cp875", displayName: "IBM EBCDIC (Greek Modern)" },
    { codePage: 932, name: "shift_jis", displayName: "Japanese (Shift-JIS)" },
    { codePage: 936, name: "gb2312", displayName: "Chinese Simplified (GB2312)" },
    { codePage: 949, name: "ks_c_5601-1987", displayName: "Korean" },
    { codePage: 950, name: "big5", displayName: "Chinese Traditional (Big5)" },
    { codePage: 1026, name: "IBM1026", displayName: "IBM EBCDIC (Turkish Latin-5)" },
    { codePage: 1047, name: "IBM01047", displayName: "IBM Latin-1" },
    { codePage: 1140, name: "IBM01140", displayName: "IBM EBCDIC (US-Canada-Euro)" },
    { codePage: 1141, name: "IBM01141", displayName: "IBM EBCDIC (Germany-Euro)" },
    { codePage: 1142, name: "IBM01142", displayName: "IBM EBCDIC (Denmark-Norway-Euro)" },
    { codePage: 1143, name: "IBM01143", displayName: "IBM EBCDIC (Finland-Sweden-Euro)" },
    { codePage: 1144, name: "IBM01144", displayName: "IBM EBCDIC (Italy-Euro)" },
    { codePage: 1145, name: "IBM01145", displayName: "IBM EBCDIC (Spain-Euro)" },
    { codePage: 1146, name: "IBM01146", displayName: "IBM EBCDIC (UK-Euro)" },
    { codePage: 1147, name: "IBM01147", displayName: "IBM EBCDIC (France-Euro)" },
    { codePage: 1148, name: "IBM01148", displayName: "IBM EBCDIC (International-Euro)" },
    { codePage: 1149, name: "IBM01149", displayName: "IBM EBCDIC (Icelandic-Euro)" },
    { codePage: 1200, name: "utf-16", displayName: "Unicode" },
    { codePage: 1201, name: "unicodeFFFE", displayName: "Unicode (Big endian)" },
    { codePage: 1250, name: "windows-1250", displayName: "Central European (Windows)" },
    { codePage: 1251, name: "windows-1251", displayName: "Cyrillic (Windows)" },
    { codePage: 1252, name: "Windows-1252", displayName: "Western European (Windows)" },
    { codePage: 1253, name: "windows-1253", displayName: "Greek (Windows)" },
    { codePage: 1254, name: "windows-1254", displayName: "Turkish (Windows)" },
    { codePage: 1255, name: "windows-1255", displayName: "Hebrew (Windows)" },
    { codePage: 1256, name: "windows-1256", displayName: "Arabic (Windows)" },
    { codePage: 1257, name: "windows-1257", displayName: "Baltic (Windows)" },
    { codePage: 1258, name: "windows-1258", displayName: "Vietnamese (Windows)" },
    { codePage: 1361, name: "Johab", displayName: "Korean (Johab)" },
    { codePage: 10000, name: "macintosh", displayName: "Western European (Mac)" },
    { codePage: 10001, name: "x-mac-japanese", displayName: "Japanese (Mac)" },
    { codePage: 10002, name: "x-mac-chinesetrad", displayName: "Chinese Traditional (Mac)" },
    { codePage: 10003, name: "x-mac-korean", displayName: "Korean (Mac)" },
    { codePage: 10004, name: "x-mac-arabic", displayName: "Arabic (Mac)" },
    { codePage: 10005, name: "x-mac-hebrew", displayName: "Hebrew (Mac)" },
    { codePage: 10006, name: "x-mac-greek", displayName: "Greek (Mac)" },
    { codePage: 10007, name: "x-mac-cyrillic", displayName: "Cyrillic (Mac)" },
    { codePage: 10008, name: "x-mac-chinesesimp", displayName: "Chinese Simplified (Mac)" },
    { codePage: 10010, name: "x-mac-romanian", displayName: "Romanian (Mac)" },
    { codePage: 10017, name: "x-mac-ukrainian", displayName: "Ukrainian (Mac)" },
    { codePage: 10021, name: "x-mac-thai", displayName: "Thai (Mac)" },
    { codePage: 10029, name: "x-mac-ce", displayName: "Central European (Mac)" },
    { codePage: 10079, name: "x-mac-icelandic", displayName: "Icelandic (Mac)" },
    { codePage: 10081, name: "x-mac-turkish", displayName: "Turkish (Mac)" },
    { codePage: 10082, name: "x-mac-croatian", displayName: "Croatian (Mac)" },
    { codePage: 12000, name: "utf-32", displayName: "Unicode (UTF-32)" },
    { codePage: 12001, name: "utf-32BE", displayName: "Unicode (UTF-32 Big endian)" },
    { codePage: 20000, name: "x-Chinese-CNS", displayName: "Chinese Traditional (CNS)" },
    { codePage: 20001, name: "x-cp20001", displayName: "TCA Taiwan" },
    { codePage: 20002, name: "x-Chinese-Eten", displayName: "Chinese Traditional (Eten)" },
    { codePage: 20003, name: "x-cp20003", displayName: "IBM5550 Taiwan" },
    { codePage: 20004, name: "x-cp20004", displayName: "TeleText Taiwan" },
    { codePage: 20005, name: "x-cp20005", displayName: "Wang Taiwan" },
    { codePage: 20105, name: "x-IA5", displayName: "Western European (IA5)" },
    { codePage: 20106, name: "x-IA5-German", displayName: "German (IA5)" },
    { codePage: 20107, name: "x-IA5-Swedish", displayName: "Swedish (IA5)" },
    { codePage: 20108, name: "x-IA5-Norwegian", displayName: "Norwegian (IA5)" },
    { codePage: 20127, name: "us-ascii", displayName: "US-ASCII" },
    { codePage: 20261, name: "x-cp20261", displayName: "T.61" },
    { codePage: 20269, name: "x-cp20269", displayName: "ISO-6937" },
    { codePage: 20273, name: "IBM273", displayName: "IBM EBCDIC (Germany)" },
    { codePage: 20277, name: "IBM277", displayName: "IBM EBCDIC (Denmark-Norway)" },
    { codePage: 20278, name: "IBM278", displayName: "IBM EBCDIC (Finland-Sweden)" },
    { codePage: 20280, name: "IBM280", displayName: "IBM EBCDIC (Italy)" },
    { codePage: 20284, name: "IBM284", displayName: "IBM EBCDIC (Spain)" },
    { codePage: 20285, name: "IBM285", displayName: "IBM EBCDIC (UK)" },
    { codePage: 20290, name: "IBM290", displayName: "IBM EBCDIC (Japanese katakana)" },
    { codePage: 20297, name: "IBM297", displayName: "IBM EBCDIC (France)" },
    { codePage: 20420, name: "IBM420", displayName: "IBM EBCDIC (Arabic)" },
    { codePage: 20423, name: "IBM423", displayName: "IBM EBCDIC (Greek)" },
    { codePage: 20424, name: "IBM424", displayName: "IBM EBCDIC (Hebrew)" },
    { codePage: 20833, name: "x-EBCDIC-KoreanExtended", displayName: "IBM EBCDIC (Korean Extended)" },
    { codePage: 20838, name: "IBM-Thai", displayName: "IBM EBCDIC (Thai)" },
    { codePage: 20866, name: "koi8-r", displayName: "Cyrillic (KOI8-R)" },
    { codePage: 20871, name: "IBM871", displayName: "IBM EBCDIC (Icelandic)" },
    { codePage: 20880, name: "IBM880", displayName: "IBM EBCDIC (Cyrillic Russian)" },
    { codePage: 20905, name: "IBM905", displayName: "IBM EBCDIC (Turkish)" },
    { codePage: 20924, name: "IBM00924", displayName: "IBM Latin-1" },
    { codePage: 20932, name: "EUC-JP", displayName: "Japanese (JIS 0208-1990 and 0212-1990)" },
    { codePage: 20936, name: "x-cp20936", displayName: "Chinese Simplified (GB2312-80)" },
    { codePage: 20949, name: "x-cp20949", displayName: "Korean Wansung" },
    { codePage: 21025, name: "cp1025", displayName: "IBM EBCDIC (Cyrillic Serbian-Bulgarian)" },
    { codePage: 21866, name: "koi8-u", displayName: "Cyrillic (KOI8-U)" },
    { codePage: 28591, name: "iso-8859-1", displayName: "Western European (ISO)" },
    { codePage: 28592, name: "iso-8859-2", displayName: "Central European (ISO)" },
    { codePage: 28593, name: "iso-8859-3", displayName: "Latin 3 (ISO)" },
    { codePage: 28594, name: "iso-8859-4", displayName: "Baltic (ISO)" },
    { codePage: 28595, name: "iso-8859-5", displayName: "Cyrillic (ISO)" },
    { codePage: 28596, name: "iso-8859-6", displayName: "Arabic (ISO)" },
    { codePage: 28597, name: "iso-8859-7", displayName: "Greek (ISO)" },
    { codePage: 28598, name: "iso-8859-8", displayName: "Hebrew (ISO-Visual)" },
    { codePage: 28599, name: "iso-8859-9", displayName: "Turkish (ISO)" },
    { codePage: 28603, name: "iso-8859-13", displayName: "Estonian (ISO)" },
    { codePage: 28605, name: "iso-8859-15", displayName: "Latin 9 (ISO)" },
    { codePage: 29001, name: "x-Europa", displayName: "Europa" },
    { codePage: 38598, name: "iso-8859-8-i", displayName: "Hebrew (ISO-Logical)" },
    { codePage: 50220, name: "iso-2022-jp", displayName: "Japanese (JIS)" },
    { codePage: 50221, name: "csISO2022JP", displayName: "Japanese (JIS-Allow 1 byte Kana)" },
    { codePage: 50222, name: "iso-2022-jp", displayName: "Japanese (JIS-Allow 1 byte Kana - SO/SI)" },
    { codePage: 50225, name: "iso-2022-kr", displayName: "Korean (ISO)" },
    { codePage: 50227, name: "x-cp50227", displayName: "Chinese Simplified (ISO-2022)" },
    { codePage: 51932, name: "euc-jp", displayName: "Japanese (EUC)" },
    { codePage: 51936, name: "EUC-CN", displayName: "Chinese Simplified (EUC)" },
    { codePage: 51949, name: "euc-kr", displayName: "Korean (EUC)" },
    { codePage: 52936, name: "hz-gb-2312", displayName: "Chinese Simplified (HZ)" },
    { codePage: 54936, name: "GB18030", displayName: "Chinese Simplified (GB18030)" },
    { codePage: 57002, name: "x-iscii-de", displayName: "ISCII Devanagari" },
    { codePage: 57003, name: "x-iscii-be", displayName: "ISCII Bengali" },
    { codePage: 57004, name: "x-iscii-ta", displayName: "ISCII Tamil" },
    { codePage: 57005, name: "x-iscii-te", displayName: "ISCII Telugu" },
    { codePage: 57006, name: "x-iscii-as", displayName: "ISCII Assamese" },
    { codePage: 57007, name: "x-iscii-or", displayName: "ISCII Oriya" },
    { codePage: 57008, name: "x-iscii-ka", displayName: "ISCII Kannada" },
    { codePage: 57009, name: "x-iscii-ma", displayName: "ISCII Malayalam" },
    { codePage: 57010, name: "x-iscii-gu", displayName: "ISCII Gujarati" },
    { codePage: 57011, name: "x-iscii-pa", displayName: "ISCII Punjabi" },
    { codePage: 65000, name: "utf-7", displayName: "Unicode (UTF-7)" },
    { codePage: 65001, name: "utf-8", displayName: "Unicode (UTF-8)" },
];
//# sourceMappingURL=babelless.js.map