import scrapy
from bs4 import BeautifulSoup

class NaverBlogSpider(scrapy.Spider):
    name = "onsik_blog"
    start_urls = [
        "https://search.naver.com/search.naver?where=blog&query=순천+맛집+내돈내산",
        "https://search.naver.com/search.naver?where=blog&query=순천+한식+내돈내산",
        "https://search.naver.com/search.naver?where=blog&query=순천+카페+내돈내산",
    ]

    def parse(self, response):
        for link in response.css('.total_wrap a::attr(href)').getall():
            yield scrapy.Request(link, callback=self.parse_blog)

    def parse_blog(self, response):
        soup = BeautifulSoup(response.text, 'html.parser')
        content = soup.find('div', {'class': 'se-main-container'})
        if content:
            text = content.get_text(separator=' ', strip=True)
            if '내돈내산' in text:  # 광고 필터
                yield {
                    'source_url': response.url,
                    'content': text,
                    'is_organic': True,
                }
