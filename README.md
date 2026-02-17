# EduBlitz EBS Backup Automation

A beginner-friendly serverless project. Students click a button on a website, and an EBS snapshot is created automatically using AWS Lambda.

**Repository:** [https://github.com/atulyw/EduBlitz-EBS-Backup-Automation](https://github.com/atulyw/EduBlitz-EBS-Backup-Automation)

```bash
git clone https://github.com/atulyw/EduBlitz-EBS-Backup-Automation.git
```

---

## Prerequisites

- An AWS account
- Basic familiarity with the AWS Console

---

## SECTION 1: Create EBS Volume

You need an EBS volume before you can create snapshots.

1. Log in to the **AWS Console** and open **EC2**.
2. In the left menu, click **Volumes** (under **Elastic Block Store**).
3. Click **Create volume**.
4. Choose:
   - **Size**: e.g. **1** GiB (minimum for learning).
   - **Availability Zone**: Any (e.g. same as your default VPC).
   - Leave other options as default.
5. Click **Create volume**.
6. After it is created, select the volume and copy its **Volume ID** (e.g. `vol-0123456789abcdef0`).  
   **Save this ID** — you will use it in the Lambda function.

---

## SECTION 2: Create IAM Role for Lambda

Lambda needs permission to create EBS snapshots. You do this by creating a role and attaching a policy.

1. Open **IAM** in the AWS Console.
2. Click **Roles** in the left menu, then **Create role**.
3. **Trusted entity type**: **AWS service**.
4. **Use case**: **Lambda**. Click **Next**.
5. In the search box, type **AmazonEC2FullAccess**.
6. Check the box next to **AmazonEC2FullAccess**, then click **Next**.
7. **Role name**: e.g. `edublitz-ebs-backup-lambda-role`. Click **Create role**.
8. Remember this role name — you will attach it to your Lambda function.

---

## SECTION 3: Create Lambda Function

1. Open **Lambda** in the AWS Console.
2. Click **Create function**.
3. Choose **Author from scratch**.
4. **Function name**: e.g. `edublitz-ebs-backup`.
5. **Runtime**: **Python 3.10**.
6. Under **Permissions**, expand **Change default execution role**.
   - Select **Use an existing role**.
   - Choose the role you created (e.g. `edublitz-ebs-backup-lambda-role`).
7. Click **Create function**.
8. In the **Code** tab, delete the default code and paste the contents of `backend/lambda_function.py` from this project.
9. In the code, find the line:
   ```python
   VOLUME_ID = "REPLACE_WITH_VOLUME_ID"
   ```
   Replace `REPLACE_WITH_VOLUME_ID` with your actual EBS **Volume ID** (from Section 1).
10. Click **Deploy** to save.

---

## SECTION 4: Test Lambda

1. In your Lambda function page, open the **Test** tab.
2. Click **Create new test event**.
   - **Event name**: e.g. `TestBackup`.
   - Leave the default JSON `{}` as is.
3. Click **Save**, then click **Test**.
4. Check the **Execution result**:
   - You should see **statusCode: 200** and **body** containing a snapshot ID (e.g. `snap-0abc123...`).
5. In **EC2** → **Snapshots**, confirm that a new snapshot was created.

---

## SECTION 5: Create API Gateway

Connect the website to Lambda using API Gateway.

1. Open **API Gateway** in the AWS Console.
2. Click **Create API**.
3. Under **HTTP API**, click **Build**.
4. Click **Add integration**.
   - **Integration type**: **Lambda**.
   - **Lambda function**: Select your function (e.g. `edublitz-ebs-backup`).
5. Click **Next**.
6. **API name**: e.g. `edublitz-ebs-backup-api`.
7. Click **Next**.
8. **Configure routes**:
   - **Method**: **POST**.
   - **Resource path**: `/backup`.
   - **Integration**: Your Lambda function should already be selected.
9. Click **Next**, then **Create**.
10. On the **Stages** page, note the **Invoke URL** (e.g. `https://abc123xyz.execute-api.us-east-1.amazonaws.com`).  
    **Save this URL** — you will put it in `script.js`.
11. **Configure CORS** (required for the website to call the API from the browser):
    - In the API Gateway console, select your API.
    - In the left menu, click **CORS** (under **Develop**).
    - Under **Access-Control-Allow-Origin**, enter your CloudFront URL (e.g. `https://d22e3v4zzmxbjj.cloudfront.net`) or `*` to allow any origin.
    - Ensure **POST** is in **Access-Control-Allow-Methods**.
    - Add `Content-Type` to **Access-Control-Allow-Headers** if you send JSON.
    - Click **Save**.

---

## SECTION 6: Test API Gateway

1. Use a REST client (e.g. Postman, or `curl` in a terminal).
2. Send a **POST** request to:  
   `https://YOUR_INVOKE_URL/backup`  
   (Use the Invoke URL from Section 5 and add `/backup`.)
3. Example with `curl`:
   ```bash
   curl -X POST https://YOUR_INVOKE_URL/backup
   ```
4. You should get a response with a snapshot ID. Check **EC2** → **Snapshots** to confirm a new snapshot.

---

## SECTION 7: Create S3 Bucket

Host the website files in S3.

1. Open **S3** in the AWS Console.
2. Click **Create bucket**.
3. **Bucket name**: e.g. `edublitz-ebs-backup-website` (must be globally unique).
4. **Region**: Choose the same region you use for Lambda/API Gateway.
5. Leave **Block Public Access** as default for now (CloudFront will access the bucket via origin access).
6. Click **Create bucket**.
7. Open the bucket, then click **Upload**.
8. Upload the three frontend files:
   - `frontend/index.html`
   - `frontend/style.css`
   - `frontend/script.js`
9. After upload, select the bucket name again, go to **Properties**.
10. Under **Static website hosting**, click **Edit**.
    - **Hosting type**: **Host a static website**.
    - **Index document**: `index.html`.
    - **Error document**: optional (e.g. `index.html` for SPAs).
11. Click **Save**.  
    Note: For CloudFront we will use the bucket as an **S3 origin** (not the static website URL). So you can use either the S3 website endpoint or the bucket name as origin; the next section uses the bucket name.

---

## SECTION 8: Create CloudFront Distribution

Use CloudFront to serve the website over HTTPS.

1. Open **CloudFront** in the AWS Console.
2. Click **Create distribution**.
3. **Origin domain**: Choose your S3 bucket (e.g. `edublitz-ebs-backup-website.s3.amazonaws.com`).
4. **Origin path**: Leave blank.
5. **Name**: Auto-filled from bucket name.
6. **Viewer protocol policy**: **Redirect HTTP to HTTPS** (recommended).
7. **Default root object**: `index.html`.
8. Leave other settings as default and click **Create distribution**.
9. Wait until **Status** is **Enabled**. Copy the **Distribution domain name** (e.g. `d1234abcd.cloudfront.net`).  
   Your website URL will be: `https://DISTRIBUTION_DOMAIN_NAME`.

---

## SECTION 9: Connect Website with API

The website must call your API Gateway URL when the user clicks **Create Backup**.

1. Open `frontend/script.js` in this project.
2. Find the line:
   ```javascript
   const API_GATEWAY_URL = 'REPLACE_WITH_YOUR_API_GATEWAY_URL';
   ```
3. Replace `REPLACE_WITH_YOUR_API_GATEWAY_URL` with your **API Gateway** Invoke URL (from Section 5).  
   - **Use the API Gateway URL only** — it looks like `https://xxxxx.execute-api.us-east-1.amazonaws.com`.
   - **Do NOT use your CloudFront URL** (e.g. `https://d1234.cloudfront.net`). CloudFront only serves the website; it cannot handle POST requests and will return 403.
   - Do **not** add `/backup` here — the code already appends it.
   - Example: `const API_GATEWAY_URL = 'https://abc123xyz.execute-api.us-east-1.amazonaws.com';`
4. Save the file, then **re-upload** `script.js` to your S3 bucket (overwrite the existing file).
5. In CloudFront, open your distribution, go to **Behaviors**, select the default behavior, and click **Edit**. Under **Cache key and origin requests**, you can add a cache policy that allows caching or invalidate the default cache so the new `script.js` is served. For quick testing, you can create an **invalidation** with path `/*` so CloudFront serves the updated file.

---

## SECTION 10: Test Application

1. Open your CloudFront URL in a browser:  
   `https://YOUR_DISTRIBUTION_DOMAIN_NAME`
2. You should see the title **EduBlitz EBS Backup Automation** and the **Create Backup** button.
3. Click **Create Backup**.
4. The page should show:
   - **Snapshot Created Successfully**
   - **Snapshot ID: snap-xxxxxxxx**
5. In **EC2** → **Snapshots**, verify that a new snapshot was created.

If the button does nothing or you see an error, check the browser’s Developer Tools (F12) → **Console** and **Network** tabs for errors. Confirm that `script.js` has the correct API Gateway URL and that the API Gateway URL is reachable (CORS is enabled by default for HTTP API).

---

## SECTION 11: Architecture Explanation (Very Simple)

| Component      | Role in this project                                      |
|----------------|-----------------------------------------------------------|
| **CloudFront** | Delivers the website to the user (fast, over HTTPS).      |
| **S3**         | Stores the website files (HTML, CSS, JS).                 |
| **API Gateway**| Receives the “Create Backup” request from the website.    |
| **Lambda**     | Runs your code and creates the EBS snapshot.             |
| **EBS**        | The storage volume that gets backed up as a snapshot.     |

Flow: **User** → **CloudFront** → **S3** (website). User clicks **Create Backup** → **API Gateway** → **Lambda** → **EC2** (create snapshot). The website then shows the snapshot ID returned by Lambda.

---

## SECTION 12: Learning Outcomes

After completing this project, students will have practiced:

- **Lambda automation** — Running code in response to events (here, an API call).
- **API Gateway integration** — Exposing Lambda as an HTTP endpoint.
- **EBS backup automation** — Creating snapshots programmatically with boto3.
- **Serverless architecture** — No servers to manage; Lambda and API Gateway scale automatically.
- **CloudFront hosting** — Serving a static site from S3 via a CDN with HTTPS.

---

## SECTION 13: Cleanup Steps

When you are done, remove resources to avoid ongoing charges:

1. **CloudFront**: Open your distribution → **Disable** it, wait for deployment, then **Delete**.
2. **S3**: Empty the bucket (delete all objects), then **Delete** the bucket.
3. **API Gateway**: Open your API → **Delete** the API.
4. **Lambda**: Open your function → **Actions** → **Delete**.
5. **Snapshots**: In **EC2** → **Snapshots**, select snapshots created by this project → **Actions** → **Delete snapshot**.
6. **EBS volume**: In **EC2** → **Volumes**, select the volume you created → **Actions** → **Delete volume**.
7. **IAM role**: In **IAM** → **Roles**, find the role you created (e.g. `edublitz-ebs-backup-lambda-role`) → **Delete**.

Delete in this order to avoid dependency errors (e.g. disable/delete CloudFront before deleting the S3 bucket if CloudFront uses it).

---

## Project Structure

```
edublitz-ebs-backup-automation/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/
│   └── lambda_function.py
│
└── README.md
```

---

## Quick Reference

- **Lambda**: Update `VOLUME_ID` in `backend/lambda_function.py`.
- **Website**: Update `API_GATEWAY_URL` in `frontend/script.js` with your **API Gateway** Invoke URL (not CloudFront).
- **CORS**: AWS HTTP API allows cross-origin requests by default; if you use a custom domain or restrict origins, you may need to configure CORS in API Gateway and ensure Lambda responses include the correct headers if required.

---

## Troubleshooting

### 403 ERROR: "The request could not be satisfied" / "supports only cachable requests"

**Cause:** The "Create Backup" button is sending the POST request to your **CloudFront** URL instead of your **API Gateway** URL. CloudFront is set up to serve static files (GET only); it does not accept POST and returns 403.

**Fix:**

1. Open **API Gateway** in the AWS Console → your API → **Stages** → copy the **Invoke URL** (e.g. `https://abc123xyz.execute-api.us-east-1.amazonaws.com`).
2. In `frontend/script.js`, set:
   ```javascript
   const API_GATEWAY_URL = 'https://YOUR_ACTUAL_API_GATEWAY_INVOKE_URL';
   ```
   Use the URL from step 1. Do **not** use your CloudFront domain.
3. Save, re-upload `script.js` to S3, and create a CloudFront invalidation for `/*` (or wait for cache to expire) so the updated script is served.
4. Reload the website and click **Create Backup** again.

### CORS ERROR: "has been blocked by CORS policy"

**Cause:** The browser blocks the request because the API Gateway does not include `Access-Control-Allow-Origin` in its response to the preflight (OPTIONS) request.

**Fix:** Configure CORS in API Gateway (see step 11 in Section 5). Use your CloudFront origin (e.g. `https://d22e3v4zzmxbjj.cloudfront.net`) or `*` for `Access-Control-Allow-Origin`. Alternatively, the frontend sends a simple POST without custom headers to avoid preflight; ensure you have deployed the latest `script.js`.
