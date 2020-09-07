#! /usr/bin/env node
var inquirer = require('inquirer');
var chalk = require('chalk');
const { Octokit } = require("@octokit/rest");

async function promptForUsername() {
    var fa = await inquirer.prompt([{
        type: 'input',
        name: 'owner',
        message: "Github Username:"
    }])
    return fa['owner'];
}

async function promptForToken() {
    var fa = await inquirer.prompt([{
        type: 'input',
        name: 'token',
        message: "Enter your Github Personal Access Token with repository rights:"
    }])
    return fa['token'];
}

function promiseAllIterativeOrFailureObject(promises) {
    return new Promise((resolve, reject) => {
        let results = [];
        let completed = 0;
       
        const handleResult = (result, index) => {
            results[index] = result;
            completed += 1;

            if (completed == promises.length) {
                resolve(results);
            }
        }

        promises.forEach((promise, index) => {
            Promise.resolve(promise).then((r) => handleResult(r, index)).catch((e) => handleResult({fail: true}, index));
        });
    });
}

async function main() {
    const githubOwner = process.env.GITHUB_USERNAME || await promptForUsername();
    const token = process.env.GITHUB_TOKEN || await promptForToken();
    const octokit = new Octokit({ auth: `token ${token}` });

    var { data: repos } = await octokit.repos.listForUser({ username: githubOwner, headers: { 'If-None-Match': '' } });

    const getRepoTrafficDataFor = async (repos, urlEnding) => {
        var promisesForAllRepos = repos.map((r) => {
            try {
            return octokit.request(`GET /repos/${githubOwner}/${r.name}/traffic/${urlEnding}`)
            } catch(e) {
                return new Promise((resolve, reject) => {
                    resolve({ failed: true, data: { count: 0 } })
                }) 
            }
        })

        const allResponses = await promiseAllIterativeOrFailureObject(promisesForAllRepos);
        const dataOrFail = (r) => { return r.failed ? r : r.data }
        return allResponses.map(dataOrFail)
    }

    const clones = await getRepoTrafficDataFor(repos, 'clones')
    const referrers = await getRepoTrafficDataFor(repos, 'popular/referrers')
    const paths = await getRepoTrafficDataFor(repos, 'popular/paths')
    const views = await getRepoTrafficDataFor(repos, 'views')

    repos = repos.map((r, index) => {
        console.log(chalk.yellow(`\n\nRepo: ${r.name}:`));
        console.log(chalk.blue("Clones:"), clones[index]);
        console.log(chalk.blue("Referrers:"), referrers[index]);
        console.log(chalk.blue("Paths:"), paths[index]);
        console.log(chalk.blue("Views:"), views[index]);

        r.totalClones = clones[index].count;
        r.totalViews = views[index].count;    
        return r;    
    })

    const printLineIndented = (rl) => { console.log(`  ${rl}`); };

    repos.sort((a, b) => {
        if (a.totalClones > b.totalClones) return -1;
        if (a.totalClones < b.totalClones) return 1;
        return 0;
    });
    const formatColoredLine = (r, c) => `${chalk.blue(r)} - ${chalk.green(c)}`
    const reposByCloneCount = repos.map((r) => formatColoredLine(r.name, r.totalClones));
    console.log(chalk.yellow("\n\n\nRepos sorted by total clone count: "));
    reposByCloneCount.forEach((rl) => printLineIndented(rl))

    repos.sort((a, b) => {
        if (a.totalViews > b.totalViews) return -1;
        if (a.totalViews < b.totalViews) return 1;
        return 0;
    });
    const reposByViewCount = repos.map((r) => formatColoredLine(r.name, r.totalViews));
    console.log(chalk.yellow("\n\n\nRepos sorted by total view count: "));    
    reposByViewCount.forEach((rl) => printLineIndented(rl))
}


main().then(() => {})