import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_BUCKET = import.meta.env.VITE_SUPABASE_BUCKET_NAME;
const suffixLength = 5;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_BUCKET) {
    throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

// export async function standardUpload(file: File, fileUrl: string) {
//     try {
//         const { data, error } = await supabase.storage
//             .from(SUPABASE_BUCKET)
//             .upload(fileUrl, file, { upsert: false });
//         return data;
//     } catch (error) {
//         console.error("标准上传出错:", error);
//     }
// }

// export async function resumeableUpload(file: File, fileUrl: string) {
// }

export async function deleteFile(fileUrl: string) {
    try {
        const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .remove([fileUrl]);
        if (error) {
            console.error("删除失败:", error.message);
            return false;
        }
        console.log("文件删除成功:", fileUrl);
        console.log(data);
        console.log(supabase.storage.from(SUPABASE_BUCKET).list(''));
        return true;
    } catch (error) {
        console.error("删除出错:", error);
        return false;
    }
}
export async function getFileList() {
    try {
        const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .list('');
        return data;
    } catch (error) {
        console.error("获取文件列表出错:", error);
        return [];
    }
}

export async function uploadFile(file: File) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_BUCKET) {
        throw new Error('Missing Supabase environment variables');
    }

    try {
        if (!file) return;

        // 用户验证
        // const { data: { user } } = await supabase.auth.signInWithPassword({
        //     email: 'airtual31959@gmail.com',
        //     password: 'zhao040211zZ!'
        // })

        // if (!user) {
        //     console.error("User not found");
        //     return;
        // }

        // 随机后缀
        const fileNameParts = file.name.split('.'); // 按 `.` 分割文件名
        const fileExt = fileNameParts.pop(); // 取出最后一个部分作为扩展名，处理包含多个`.`的情况
        const fileNameWithoutExt = fileNameParts.join('.'); // 剩余部分作为文件名
    
        // 生成随机后缀
        const randomSuffix = Math.random().toString(36).slice(-suffixLength);
    
        // 拼接路径：文件名-随机后缀.扩展名
        const filePath = `${fileNameWithoutExt}-${randomSuffix}.${fileExt}`;

        // 格式化URL
        const encodedFilePath = encodeURIComponent(filePath); // 替换空格符
        const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .upload(encodedFilePath, file, { upsert: false });

        if (error) {
            console.error("Upload error:", error.message);
            return;
        }

        // 拼接 url
        const url = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}//${encodedFilePath}`;
        return url;
    } catch (error) {
        console.error("Upload error:", error);
        return null;
    }
}