# Supabase 隐私迁移

1. 在 Supabase 的 Table Editor 导出 `user_data` 与 `checkins` 备份。
2. 在 Authentication > Providers 启用 **Anonymous Sign-Ins**。
3. 部署本次前端更新后，只用你原来的浏览器打开网站一次。
4. 在浏览器开发者工具 Console 输入 `Supabase.userId`，复制返回的 UUID。
5. 打开 `migrations/20260811_private_workspace.sql`，将 `owner_id` 的全零 UUID 替换为该值，然后在 Supabase SQL Editor 执行。
6. 部署 `video-metadata` Edge Function，并保留 JWT 验证；函数只解析抖音/B站的公开页面元数据。

迁移完成后，朋友访问相同网址仍可看每日公开资讯，但不能读取或覆盖你的个人记录。匿名身份保存在浏览器中；请在健身页面绑定恢复邮箱，再清除浏览器数据或更换设备。

## 表达训练部署

1. 在 Supabase SQL Editor 执行 `migrations/20260814_expression_training.sql`。
2. 部署 `expression-card` Edge Function，并保留 JWT 验证。
3. 仅在 Supabase Edge Function Secrets 配置 `DEEPSEEK_API_KEY`；如需“增强网感”，再配置 `OPENAI_API_KEY`。不要把密钥写进前端或 GitHub 仓库。
4. 在 GitHub Actions Secrets 配置同名 `DEEPSEEK_API_KEY`，供每周一的精选灵感任务使用；已有的 `SUPABASE_SERVICE_ROLE_KEY` 用于写入本周灵感。

函数只提炼允许公开读取的文章，不登录抖音，也不会批量抓取推荐流；数据库只保存练习卡、摘要和来源链接。
