require('dotenv').config()
const { globalAgent } = require('https')
const ProxyAgent = require('proxy-agent')
const fetch = require('node-fetch')
const randomNumber = require('random-number-csprng')

const token = process.env.TWITTER_TOKEN
const proxy = process.env.HTTPS_PROXY
const tweetID = process.env.TWEET_ID

// in case cannot connect to the twitter, use yourself proxy
const agent =
  process.env.HTTPS_PROXY != null
    ? new ProxyAgent(proxy)
    : globalAgent

const params = new URLSearchParams(
  [
    ['query', `conversation_id:${tweetID}`],
    ['max_results', '100'],
    ['tweet.fields', 'author_id,text,id']
  ]
)

const headers = {
  Authorization: 'Bearer ' + token
}

const fetchUser = async (author_id) => {
  return await fetch(
    'https://api.twitter.com/2/users/' + author_id,
    {
      method: 'GET',
      headers,
      agent
    }).then(async response => {
    return JSON.parse(await response.text()).data
  })
}

const fetchReplies = async (next_token) => {
  if (next_token) {
    params.set('next_token', next_token)
  }
  const {
    data: replies = [],
    meta
  } = await fetch(
    'https://api.twitter.com/2/tweets/search/recent?' + params,
    {
      method: 'GET',
      headers,
      agent
    }).then(async response => {
    return JSON.parse(await response.text())
  })
  if (typeof meta.next_token === 'string') {
    const nextReplies = await fetchReplies(meta.next_token)
    replies.push(...nextReplies)
  }
  return replies
}

const filterSameID = (replies = []) => {
    const idSet = new Set()
    const result = []
    for (let reply of replies) {
      const id = reply.author_id
      if (idSet.has(id) === false) {
        result.push(reply)
        idSet.add(id)
      }
    }
    return result
  }

;(async () => {
  console.log(`target tweet id: ${tweetID}`)
  console.log('fetching tweet replies...')
  const replies = await fetchReplies().then(data => {
    console.log('filter same id...')
    return data
  }).then(filterSameID)
  const pos = await randomNumber(0, replies.length - 1)
  const { author_id, text } = replies[pos]
  console.log(
    author_id
  )
  const { name, username } = await fetchUser(author_id)

  console.log(`name: ${name}(${username}) is winner. author_id: ${author_id}`)
  console.log(`tweet: '${text}'`)

  console.log('-----------------------')
  console.log(`all included ${replies.length} replies:`)
  replies.forEach(({ author_id, id, text }) => {
    console.log(`author_id: ${author_id}, id: ${id}, text: ${text}`)
  })
})()
