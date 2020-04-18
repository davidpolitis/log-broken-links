'use strict';

const config = require('./config');
const Queue = require('./queue');
const { promises: fs } = require("fs");
const path = require("path");
const axios = require('axios');
const cheerio = require('cheerio'); // Use jsdom or Puppeteer instead if JS must be executed on page

const axiosInstance = axios.create({
    timeout: config.timeout,
    headers: config.headers
});

const queue = new Queue(config.concurrency, config.rateLimit);

function isOk(statusCode)
{
    return statusCode >= 200 && statusCode < 300;
}

function isMatch(regexp, str)
{
    return new RegExp(regexp).test(str) || regexp == str;
}

function getOembedUrl(url)
{
    for (const oembed of config.oembedUrls)
    {
        if (isMatch(oembed.hostname, url.hostname) && isMatch(oembed.path, url.pathname))
            return oembed.redirect_prefix + url.href;
    }

    return null;
}

function isNotFoundUrl(url)
{
    for (const notFound of config.notfoundUrls)
    {
        if (isMatch(notFound.hostname, url.hostname) && isMatch(notFound.path, url.pathname))
            return true;
    };

    return false;
}

function getNotFoundTest(url)
{
    for (const notFoundTest of config.notFoundTests)
    {
        if (isMatch(notFoundTest.hostname, url.hostname) && isMatch(notFoundTest.path, url.pathname))
            return notFoundTest;
    }

    return null;
}

async function checkExternalPage(url, referrer)
{
    if (url)
    {
        const oembedUrl = getOembedUrl(url);

        // URLs that always return 404s if translated to oembed Urls
        if (oembedUrl)
        {
            console.log(`Fetching ${oembedUrl} (${url.href})...`);

            try
            {
                const res = await axiosInstance.head(oembedUrl);

                if (!isOk(res.status))
                    console.error(`Failed to fetch ${oembedUrl} (${url.href}) (${res.status})! | Referrer: ${referrer}`);
            }
            catch(error)
            {
                console.error(`Error for ${url.href} - ${error} | Referrer: ${referrer}`);
            }
        }
        // Other URLs...
        else
        {
            console.log(`Fetching ${url.href}...`);

            try
            {
                const res = await axiosInstance.get(url.href);

                if (isOk(res.status))
                {
                    // Run special found found checks if response is OK
                    if (!isNotFoundUrl(url))
                    {
                        const html = res.data;

                        if (html)
                        {
                            const notFoundTest = getNotFoundTest(url);

                            if (notFoundTest)
                            {
                                if (notFoundTest.test(html))
                                    console.error(`Content matches 404 test for ${url.href} (${res.status})! | Referrer: ${referrer}`);
                            }
                            else if (config.genericNotFoundTest(html))
                            {
                                console.error(`Content matches generic 404 test for ${url.href} (${res.status})! | Referrer: ${referrer}`);
                            }
                        }
                        else
                        {
                            console.error(`Content was empty for ${url.href}! | Referrer: ${referrer}`);
                        }
                    }
                }
                else
                {
                    console.error(`Failed to fetch ${url.href} (${res.status})! | Referrer: ${referrer}`);
                }
            }
            catch(error)
            {
                console.error(`Error for ${url.href} - ${error} | Referrer: ${referrer}`);
            }
        }
    }
}

async function checkInternalPageByUrl(url, referrer)
{
    if (url)
    {
        console.log(`Fetching ${url.href}...`);

        try
        {
            const res = await axiosInstance.get(url.href);

            if (isOk(res.status))
            {
                const html = res.data;

                if (html)
                {
                    const $ = await cheerio.load(html);

                    $('a').each(function()
                    {
                        const href = $(this).attr('href');

                        if (href && !href.startsWith('mailto'))
                        {
                            // Convert relative URL to absolute
                            let nextUrl;

                            try
                            {
                                nextUrl = new URL(href, url);
                            }
                            catch(error)
                            {
                                console.log(`Could not parse URL ${href} on page ${url.href}! | Referrer: ${referrer}`);
                                return; // continue to next iteration
                            }

                            if (nextUrl.hostname == url.hostname)
                                queue.add(() => checkInternalPageByUrl(nextUrl, url.href));
                            else
                                queue.add(() => checkExternalPage(nextUrl, url.href));
                        }
                    });
                }
                else
                {
                    console.error(`Content was empty for ${url.href}! | Referrer: ${referrer}`);
                }
            }
            else
            {
                console.error(`Failed to fetch page ${url.href}! (${res.status}) | Referrer: ${referrer}`);
            }
        }
        catch(error)
        {
            console.error(`Error for ${url.href} - ${error} | Referrer: ${referrer}`);
        }
    }
}

async function checkInternalPagesByDir(initialDir)
{
    try
    {
        const files = await fs.readdir(initialDir, { withFileTypes: true });

        for (const file of files)
        {
            const fullPath = path.join(initialDir, file.name);

            if (file.isFile())
            {
                const html = await fs.readFile(fullPath, 'utf8');
                const $ = await cheerio.load(html);

                $('a').each(function()
                {
                    const href = $(this).attr('href');

                    if (href)
                    {
                        // Convert relative URL to absolute
                        let nextUrl;

                        try
                        {
                            nextUrl = new URL(href, 'file:///');
                        }
                        catch(error)
                        {
                            console.log(`Could not parse URL ${href} on page ${fullPath}!`);
                            return; // continue to next iteration
                        }
                        
                        // Ensure URL is absolute (so we know it's external)
                        if (nextUrl.href == href && !href.startsWith('mailto'))
                            queue.add(() => checkExternalPage(nextUrl, fullPath));
                    }
                });
            }
            else
            {
                return checkInternalPagesByDir(fullPath);
            }
        }
    }
    catch(error)
    {
        console.error(error);
    }
}

async function start()
{
    if (config.useInitialUrls)
    {
        for (const url of config.initialUrls)
        {
            let parsedUrl;

            try
            {
                parsedUrl = new URL(url);
            }
            catch(error)
            {
                console.log(`Could not parse initial URL ${url}!`);
                return; // continue to next iteration
            }
            queue.add(() => checkInternalPageByUrl(parsedUrl));
        }
    }
    else
    {
        for (const initialDir of config.initialDirectories)
        {
            await checkInternalPagesByDir(initialDir);
        }
    }
}

start();