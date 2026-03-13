# MongoDB Atlas Manual Backup Guide

This guide explains how to manually export MongoDB Atlas collections and store JSON backups in this `backups/` folder.

## Prerequisites

- Access to the MongoDB Atlas project and cluster
- A database user with read access to the collections you need to export
- MongoDB Database Tools installed locally (`mongoexport`)

## 1. Get Atlas Connection Details

1. Open MongoDB Atlas.
2. Go to your cluster and choose **Connect**.
3. Select **Drivers** or **MongoDB Shell** and copy the connection string.
4. Keep these values handy:
   - `USERNAME`
   - `PASSWORD`
   - `CLUSTER_HOST` (for example, `cluster0.xxxxx.mongodb.net`)
   - `DATABASE_NAME`

## 2. Export a Collection as JSON

Run the following command from the repository root, replacing placeholders:

```bash
mongoexport \
  --uri="mongodb+srv://USERNAME:PASSWORD@CLUSTER_HOST/DATABASE_NAME" \
  --collection=COLLECTION_NAME \
  --type=json \
  --out="backups/COLLECTION_NAME-$(date +%Y-%m-%d).json"
```

On Windows PowerShell, use this format:

```powershell
mongoexport --uri "mongodb+srv://USERNAME:PASSWORD@CLUSTER_HOST/DATABASE_NAME" --collection COLLECTION_NAME --type json --out "backups/COLLECTION_NAME-$(Get-Date -Format yyyy-MM-dd).json"
```

## 3. Export Multiple Collections

Repeat the command for each required collection (for example: `users`, `hospitals`, `emergencyinfos`, `actionlogs`).

Example (PowerShell):

```powershell
$collections = @("users", "hospitals", "emergencyinfos", "actionlogs")
$date = Get-Date -Format yyyy-MM-dd

foreach ($name in $collections) {
  mongoexport --uri "mongodb+srv://USERNAME:PASSWORD@CLUSTER_HOST/DATABASE_NAME" --collection $name --type json --out "backups/$name-$date.json"
}
```

## 4. Verify Backup Files

After export, confirm files exist in `backups/` and have non-zero size.

## 5. Optional: Compress Backup Files

To reduce storage, compress JSON files before archiving or uploading:

```powershell
Compress-Archive -Path "backups/*.json" -DestinationPath "backups/mongodb-backup-$(Get-Date -Format yyyy-MM-dd).zip"
```

## Security Notes

- Do not commit secrets (usernames, passwords, full connection URIs) to Git.
- Prefer environment variables or secure secret managers for credentials.
- Ensure backup files are stored and shared securely because they may contain sensitive personal data.
