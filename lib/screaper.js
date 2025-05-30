const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const https = require('https');
const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('ytdl-core');
const crypto = require('crypto');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const FormData = require('form-data');
const { exec, spawn, execSync } = require('child_process');
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function bytesToSize(bytes) {
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "n/a";
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)), 10);
	if (i === 0) resolve(`${bytes} ${sizes[i]}`);
	return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
}

const agent = new https.Agent({
	rejectUnauthorized: true,
	maxVersion: 'TLSv1.3',
	minVersion: 'TLSv1.2'
});

const yousearch = axios.create({
	baseURL: 'https://app.yoursearch.ai',
	headers: {
		'content-type': 'application/json'
	}
});

async function mediafireDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const res = await fetch('https://r.jina.ai/' + url, {
				headers: {
					'x-return-format': 'html'
				}
			});
			const data = await res.text()
			const $ = cheerio.load(data);
			const link = $('a#downloadButton').attr('href');
			const size = $('a#downloadButton').text().replace('Download', '').replace('(', '').replace(')', '').trim();
			const upload_date = $('.dl-info .details li').last().find('span').text().trim();
			const name = $('div.dl-btn-label').attr('title') || link.split('/')[5];
			const type = name.split('.')[1] || '';
			resolve({ name, type, upload_date, size, link })
		} catch (e) {
			reject(e)
		}
	})
}

async function pinterest(query) {
	return new Promise(async (resolve, reject) => {
		const baseUrl = 'https://www.pinterest.com/resource/BaseSearchResource/get/';
		const params = {
			source_url: '/search/pins/?q=' + encodeURIComponent(query),
			data: JSON.stringify({
				options: {
					isPrefetch: false,
					query,
					scope: 'pins',
					no_fetch_context_on_resource: false
				},
				context: {}
			}),
			_: Date.now()
		};
		const headers = {
			'accept': 'application/json, text/javascript, */*, q=0.01',
			'accept-encoding': 'gzip, deflate',
			'accept-language': 'en-US,en;q=0.9',
			'dnt': '1',
			'referer': 'https://www.pinterest.com/',
			'sec-ch-ua': '"Not(A:Brand";v="99", "Microsoft Edge";v="133", "Chromium";v="133"',
			'sec-ch-ua-full-version-list': '"Not(A:Brand";v="99.0.0.0", "Microsoft Edge";v="133.0.3065.92", "Chromium";v="133.0.6943.142"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-model': '""',
			'sec-ch-ua-platform': '"Windows"',
			'sec-ch-ua-platform-version': '"10.0.0"',
			'sec-fetch-dest': 'empty',
			'sec-fetch-mode': 'cors',
			'sec-fetch-site': 'same-origin',
			'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 Edg/133.0.0.0',
			'x-app-version': 'c056fb7',
			'x-pinterest-appstate': 'active',
			'x-pinterest-pws-handler': 'www/[username]/[slug].js',
			'x-pinterest-source-url': '/hargr003/cat-pictures/',
			'x-requested-with': 'XMLHttpRequest'
		};
		try {
			const { data } = await axios.get(baseUrl, { httpsAgent: agent, headers, params });
			const results = data.resource_response?.data?.results?? [];
			const result = results.map(item => ({
				pin: 'https://www.pinterest.com/pin/' + item.id?? '',
				link: item.link?? '',
				created_at: (new Date(item.created_at)).toLocaleDateString('id-ID', {
					day: 'numeric',
					month: 'long',
					year: 'numeric'
				}) ?? '',
				id: item.id?? '',
				images_url: item.images?.['736x']?.url?? '',
				grid_title: item.grid_title?? ''
			}));
			resolve(result);
		} catch (e) {
			reject([])
		}
	});
}

async function remini(buffer, method = 'recolor') {
	return new Promise(async (resolve, reject) => {
		try {
			const form = new FormData();
			const input = Buffer.from(buffer);
			form.append('model_version', 1);
			form.append('image', input, { filename: 'enhance_image_body.jpg', contentType: 'image/jpeg'  });
			const { data } = await axios.post('https://inferenceengine.vyro.ai/' + method, form, {
				headers: {
					...form.getHeaders(),
					'accept-encoding': 'gzip',
					'user-agent': 'Postify/1.0.0',
				},
				responseType: 'arraybuffer',
			});
			resolve(data)
		} catch (e) {
			reject(e)
		}
	});
}

async function styletext(teks) {
	return new Promise(async (resolve, reject) => {
		axios.get('http://qaz.wtf/u/convert.cgi?text=' + teks).then(({ data }) => {
			let $ = cheerio.load(data)
			let hasil = []
			$('table > tbody > tr').each(function (a, b) {
				hasil.push({ name: $(b).find('td:nth-child(1) > span').text(), result: $(b).find('td:nth-child(2)').text().trim() })
			});
			resolve(hasil)
		});
	});
}

async function hitamkan(buffer, filter = 'coklat') {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.post('https://negro.consulting/api/process-image', JSON.stringify({
				imageData: Buffer.from(buffer).toString('base64'),
				filter
			}), {
				headers: {
					'content-type': 'application/json'
				}
			});
			if(data && data.status === 'success') {
				resolve(Buffer.from(data.processedImageUrl.split(',')[1], 'base64'))
			}
		} catch (e) {
			reject(e)
		}
	});
}

async function ringtone(title) {
	return new Promise(async (resolve, reject) => {
		axios.get('https://meloboom.com/en/search/' + title).then(({ data }) => {
			let $ = cheerio.load(data)
			let hasil = []
			$('#__next > main > section > div.jsx-2244708474.container > div > div > div > div:nth-child(4) > div > div > div > ul > li').each(function (a, b) {
				hasil.push({ title: $(b).find('h4').text(), source: 'https://meloboom.com/'+$(b).find('a').attr('href'), audio: $(b).find('audio').attr('src') })
			});
			resolve(hasil)
		});
	});
}

async function wallpaper(title, page = '1') {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.get(`https://www.besthdwallpaper.com/search?CurrentPage=${page}&q=${title}`);
			const $ = cheerio.load(data);
			const hasil = [];
			$('div.grid-item').each(function (a, b) {
				hasil.push({
					title: $(b).find('div.info > p').attr('title'),
					type: $(b).find('div.info > a:nth-child(2)').text(),
					source: 'https://www.besthdwallpaper.com' + $(b).find('a').attr('href'),
					image: [
						$(b).find('picture > img').attr('data-src') || $(b).find('picture > img').attr('src'), 
						$(b).find('picture > source:nth-child(1)').attr('srcset'), 
						$(b).find('picture > source:nth-child(2)').attr('srcset')
					]
				});
			});
			resolve(hasil)
		} catch (e) {
			reject(e)
		}
	});
}

async function wikimedia(title) {
	return new Promise(async (resolve, reject) => {
		axios.get(`https://commons.wikimedia.org/w/index.php?search=${title}&title=Special:MediaSearch&go=Go&type=image`).then(({ data }) => {
			let $ = cheerio.load(data)
			let hasil = []
			$('.sdms-search-results__list-wrapper > div > a').each(function (a, b) {
				hasil.push({ title: $(b).find('img').attr('alt'), source: $(b).attr('href'), image: $(b).find('img').attr('data-src') || $(b).find('img').attr('src') })
			});
			resolve(hasil)
		});
	});
}

async function instagramDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.post('https://yt1s.io/api/ajaxSearch', new URLSearchParams({ q: url, w: '', p: 'home', lang: 'en' }), {
				headers: {
					'Accept': 'application/json, text/plain, */*',
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'Origin': 'https://yt1s.io',
					'Referer': 'https://yt1s.io/',
					'User-Agent': 'Postify/1.0.0',
				}
			});
			const $ = cheerio.load(data.data);
			let anu = $('a.abutton.is-success.is-fullwidth.btn-premium').map((_, b) => ({
				title: $(b).attr('title'),
				url: $(b).attr('href')
			})).get()
			resolve(anu)
		} catch (e) {
			reject(e)
		}
	})
}

async function tiktokDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			let data = []
			function formatNumber(integer) {
				let numb = parseInt(integer)
				return Number(numb).toLocaleString().replace(/,/g, '.')
			}
			
			function formatDate(n, locale = 'en') {
				let d = new Date(n)
				return d.toLocaleDateString(locale, {
					weekday: 'long',
					day: 'numeric',
					month: 'long',
					year: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
					second: 'numeric'
				})
			}
			
			let domain = 'https://www.tikwm.com/api/';
			let res = await (await axios.post(domain, {}, {
				headers: {
					'Accept': 'application/json, text/javascript, */*; q=0.01',
					'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
					'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
					'Origin': 'https://www.tikwm.com',
					'Referer': 'https://www.tikwm.com/',
					'Sec-Ch-Ua': '"Not)A;Brand" ;v="24" , "Chromium" ;v="116"',
					'Sec-Ch-Ua-Mobile': '?1',
					'Sec-Ch-Ua-Platform': 'Android',
					'Sec-Fetch-Dest': 'empty',
					'Sec-Fetch-Mode': 'cors',
					'Sec-Fetch-Site': 'same-origin',
					'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
					'X-Requested-With': 'XMLHttpRequest'
				},
				params: {
					url: url,
					hd: 1
				}
			})).data.data
			if (res && !res.size && !res.wm_size && !res.hd_size) {
				res.images.map(v => {
					data.push({ type: 'photo', url: v })
				})
			} else {
				if (res && res.wmplay) {
					data.push({ type: 'watermark', url: res.wmplay })
				}
				if (res && res.play) {
					data.push({ type: 'nowatermark', url: res.play })
				}
				if (res && res.hdplay) {
					data.push({ type: 'nowatermark_hd', url: res.hdplay })
				}
			}
			let json = {
				status: true,
				title: res.title,
				taken_at: formatDate(res.create_time).replace('1970', ''),
				region: res.region,
				id: res.id,
				durations: res.duration,
				duration: res.duration + ' Seconds',
				cover: res.cover,
				size_wm: res.wm_size,
				size_nowm: res.size,
				size_nowm_hd: res.hd_size,
				data: data,
				music_info: {
					id: res.music_info.id,
					title: res.music_info.title,
					author: res.music_info.author,
					album: res.music_info.album ? res.music_info.album : null,
					url: res.music || res.music_info.play
				},
				stats: {
					views: formatNumber(res.play_count),
					likes: formatNumber(res.digg_count),
					comment: formatNumber(res.comment_count),
					share: formatNumber(res.share_count),
					download: formatNumber(res.download_count)
				},
				author: {
					id: res.author.id,
					fullname: res.author.unique_id,
					nickname: res.author.nickname,
					avatar: res.author.avatar
				}
			}
			resolve(json)
		} catch (e) {
			reject(e)
		}
	});
}

async function facebookDl(url) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.post('https://getmyfb.com/process', new URLSearchParams({
				id: decodeURIComponent(url),
				locale: 'en',
			}), {
				headers: {
					'hx-current-url': 'https://getmyfb.com/',
					'hx-request': 'true',
					'hx-target': url.includes('share') ? '#private-video-downloader' : '#target',
					'hx-trigger': 'form',
					'hx-post': '/process',
					'hx-swap': 'innerHTML',
				}
			});
			const $ = cheerio.load(data);
			resolve({
				caption: $('.results-item-text').length > 0 ? $('.results-item-text').text().trim() : '',
				preview: $('.results-item-image').attr('src') || '',
				results: $('.results-list-item').get().map(el => ({
					quality: parseInt($(el).text().trim()) || '',
					type: $(el).text().includes('HD') ? 'HD' : 'SD',
					url: $(el).find('a').attr('href') || '',
				}))
			});
		} catch (e) {
			reject(e);
		}
	});
}

async function instaStalk(username) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.get('https://greatfon.com/v/' + username.toLowerCase(), {
				headers: {
					'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
					'Accept-Language': 'en-US,en;q=0.9',
					'Cache-Control': 'no-cache',
					'Pragma': 'no-cache',
					'Connection': 'keep-alive',
					'Upgrade-Insecure-Requests': '1',
					'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
					'Sec-Fetch-Dest': 'document',
					'Sec-Fetch-Mode': 'navigate',
					'Sec-Fetch-Site': 'none',
					'Sec-Fetch-User': '?1'
				}
			});
			const $ = cheerio.load(data);
			let list_post = [];
			$('.card').each((a, b) => {
				const imageUrl = $(b).find('img').attr('src');
				const description = $(b).find('img').attr('alt').replace(/.*Instagram post:\s*/, '');
				const detailUrl = 'https://greatfon.io' + $(b).find('a').attr('href');
				list_post.push({ imageUrl, description, detailUrl });
			});
			resolve({
				avatar: $('.avatar img').attr('src') || '',
				username: $('h1.text-4xl').text().trim() || '',
				nickname: $('h2.text-2xl').text().trim() || '',
				description: $('.text-sm.font-serif').text().trim() || '',
				posts: $('.stat').eq(0).find('.stat-value').text().trim() || 0,
				followers: $('.stat').eq(1).find('.stat-value').text().trim() || 0,
				following: $('.stat').eq(2).find('.stat-value').text().trim() || 0,
				list_post
			})
		} catch (e) {
			reject(e)
		}
	})
}

async function telegramStalk(username) {
	return new Promise(async (resolve, reject) => {
		try {
			const { data } = await axios.get('https://t.me/' + username, {
				headers: {
					'x-return-format': 'html'
				}
			});
			const $ = cheerio.load(data);
			resolve({
				url: 'https://t.me/' + username,
				title: $('meta[property="og:title"]').attr('content'),
				description: $('meta[property="og:description"]').attr('content'),
				image_url: $('meta[property="og:image"]').attr('content')
			})
		} catch (e) {
			reject(e)
		}
	})
}

async function tiktokStalk(username) {
	return new Promise(async (resolve, reject) => {
		try {
			const headers = { 'referer': 'https://countik.com/user/@' + username, 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36' }
			const { data } = await axios.get('https://www.tiktok.com/oembed?url=https://www.tiktok.com/@' + username);
			const { data: res } = await axios.get('https://countik.com/api/exist/' + username, { headers });
			const { data: wet } = await axios.get('https://countik.com/api/userinfo?sec_user_id=' + res.sec_uid, { headers });
			resolve({
				...res,
				...wet,
				nickname: data.author_name
			})
		} catch (e) {
			reject(e)
		}
	})
}

async function genshinStalk(id) {
	return new Promise(async (resolve, reject) => {
		try {
			const headers = {
				'content-type': 'application/json; charset=UTF-8',
				'origin': 'https://enka.network',
				'referer': 'https://enka.network/',
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.5993.89 Safari/537.36',
			}
			const { data } = await axios.get('https://enka.network/api/uid/' + id, { headers });
			const p = data.playerInfo;
			resolve({
				uid: data.uid,
				ttl: data.ttl,
				nickname: p.nickname,
				level: p.level,
				card_id: p.nameCardId,
				signature: p.signature,
				world_level: p.worldLevel,
				achivement: p.finishAchievementNum,
				spiral_abyss: p.towerFloorIndex + ' - ' + p.towerLevelIndex,
				image: 'https://mini.s-shot.ru/990x810/PNG/975/Z100/?https://enka.network/u/' + data.uid
			})
		} catch (e) {
			reject(e)
		}
	})
}

async function instaStory(name) {
	return new Promise(async (resolve, reject) => {
		try {
			const results = [];
			const formData = new FormData();
			const key = await axios.get('https://storydownloader.app/en');
			const $$ = cheerio.load(key.data);
			const cookie = key.headers['set-cookie']
			const token = $$('input[name="_token"]').attr('value');
			const headers = {
				accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
				cookie: cookie,
				origin: 'https://storydownloader.app',
				referer: 'https://storydownloader.app/en',
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36',
				'X-CSRF-TOKEN': token
			};
			formData.append('username', name);
			formData.append('_token', token);
			const res = await axios.post('https://storydownloader.app/request', formData, {
				headers: {
					...headers,
					...formData.getHeaders()
				}
			});
			const $ = cheerio.load(res.data.html);
			const username = $('h3.card-title').text();
			const profile_url = $('img.card-avatar').attr('src');
			$('div.row > div').each(function () {
				const _ = $(this);
				const url = _.find('a').attr('href');
				const thumbnail = _.find('img').attr('src');
				const type = /video_dashinit\.mp4/i.test(url) ? 'video' : 'image';
				if (thumbnail && url) {
					results.push({
						thumbnail,
						url,
						type,
					})
				}
			});
			const data = {
				username,
				profile_url,
				results
			};
			resolve(data)
		} catch (e) {
			reject(e)
		}
	})
}

async function bk9Ai(query) {
	const teks = encodeURIComponent(query);
	const urls = ['https://bk9.fun/ai/gemini?q=','https://bk9.fun/ai/jeeves-chat?q=','https://bk9.fun/ai/jeeves-chat2?q=','https://bk9.fun/ai/mendable?q=','https://bk9.fun/ai/Aoyo?q='];
	for (let url of urls) {
		try {
			const { data } = await axios.get(url + teks);
			return data
		} catch (e) {
		}
	}
}

async function spotifyDl(url) {
	return new Promise(async(resolve, reject) => {
		try {
			const { data } = await axios.get('https://api.fabdl.com/spotify/get?url=' + url, {
				headers: {
					'content-type': 'application/json'
				}
			});
			const { data: res } = await axios.get(`https://api.fabdl.com/spotify/mp3-convert-task/${data.result.gid}/${data.result.id}`);
			resolve({
				title: data.result.name,
				duration: data.result.duration_ms,
				cover: data.result.image,
				download: "https://api.fabdl.com" + res.result.download_url,
			})
		} catch (e) {
			reject(e)
		}
	})
}

async function ytMp4(url, options) {
    return new Promise(async(resolve, reject) => {
        ytdl.getInfo(url, options).then(async(getUrl) => {
            const audioPath = path.join('./database/sampah', `audio_${Date.now()}.mp4`);
            const videoPath = path.join('./database/sampah', `video_${Date.now()}.mp4`);
            const outputPath = path.join('./database/sampah', `output_${Date.now()}.mp4`);
            await new Promise((resolv, rejectt) => {
            	ytdl(url, { format: ytdl.chooseFormat(getUrl.formats, { quality: 'highestaudio', filter: 'audioonly' })}).pipe(fs.createWriteStream(audioPath)).on('finish', resolv).on('error', rejectt);
            })
            await new Promise((resolv, rejectt) => {
            	ytdl(url, { format: ytdl.chooseFormat(getUrl.formats, { quality: 'highestvideo', filter: 'videoonly' })}).pipe(fs.createWriteStream(videoPath)).on('finish', resolv).on('error', rejectt);
            })
            await new Promise((resolv, rejectt) => {
		        exec(`ffmpeg -i ${videoPath} -i ${audioPath} -c:v copy -c:a aac ${outputPath}`, (error, stdout, stderr) => {
		            if (error) {
		                rejectt(new Error(`ffmpeg error: ${error.message}`));
		                return;
		            }
		            resolv();
		        });
		    });
            let title = getUrl.videoDetails.title;
            let desc = getUrl.videoDetails.description;
            let views = getUrl.videoDetails.viewCount;
            let likes = getUrl.videoDetails.likes;
            let dislike = getUrl.videoDetails.dislikes;
            let channel = getUrl.videoDetails.ownerChannelName;
 
