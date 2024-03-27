import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { promisify } from 'util';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const deleteFileAsync = promisify(fs.unlink);

dotenv.config();

export async function generateOpenAPI() {
    try {
        // Transpile app.ts to JavaScript
        await migrate();

        // Update the OpenAPI specification with dynamic content
        await updateOpenAPISpec();

        // Generate OpenAPI specification from the updated JSON file
        execSync(
            'npx @openapitools/openapi-generator-cli generate -i openapi.json -g openapi',
            { stdio: 'inherit' }
        );

        // Delete the generated readme file
        await deleteFileAsync('./README.md');

        console.log('OpenAPI JSON generated successfully.');
    } catch (error) {
        console.error('Failed to generate OpenAPI JSON:', error);
    }
}

async function migrate() {
    await execSync('npx ts-migrate ./app.ts ./dist/app.js');
}

async function updateOpenAPISpec() {
    const openApiSpecFile = './openapi.json';

    // Read the existing OpenAPI specification file
    const openApiSpec = JSON.parse(await readFileAsync(openApiSpecFile, 'utf8'));

    // Update the OpenAPI specification with dynamic content
    openApiSpec.info.title = process.env.TITLE || 'Pastebin.fi API';
    openApiSpec.info.termsOfService = process.env.TOS_URL || 'https://pastebin.fi/about';
    openApiSpec.info.contact.email = process.env.CONTACT_EMAIL || 'sysadmin@pastebin.fi';
    openApiSpec.servers[0].url = process.env.SERVER_URL || 'https://api.pastebin.fi';

    // Write the updated OpenAPI specification back to the file
    await writeFileAsync(openApiSpecFile, JSON.stringify(openApiSpec, null, 2));
}