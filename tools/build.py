"""분리된 편집용 소스를 외부 파일 요청이 없는 index.html로 묶습니다.
실행: python3 tools/build.py (외부 패키지 불필요)
"""
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parent.parent


def render():
    html = (ROOT / 'tools/index.template.html').read_text(encoding='utf-8')
    for filename, tag, old in [
        ('style.css', 'style', '<link rel="stylesheet" href="style.css">'),
        ('math.js', 'script', '<script src="math.js"></script>'),
        ('progress.js', 'script', '<script src="progress.js"></script>'),
        ('submission.js', 'script', '<script src="submission.js"></script>'),
        ('app.js', 'script', '<script src="app.js"></script>'),
    ]:
        source = (ROOT / filename).read_text(encoding='utf-8')
        if f'</{tag}' in source.lower():
            raise ValueError(f'{filename}: HTML 종료 태그는 인라인 소스에 넣을 수 없습니다.')
        if html.count(old) != 1:
            raise ValueError(f'템플릿에서 {filename} 삽입 위치를 찾을 수 없습니다.')
        html = html.replace(old, f'<!-- 편집 원본: {filename} -->\n<{tag}>\n{source}</{tag}>')
    return '<!-- tools/build.py로 생성됨. 화면 구조는 tools/index.template.html에서 편집하세요. -->\n' + html


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='index.html이 편집 원본과 일치하는지 검사')
    args = parser.parse_args()
    output = ROOT / 'index.html'
    html = render()
    if args.check:
        if not output.exists() or output.read_text(encoding='utf-8') != html:
            parser.exit(1, 'index.html 갱신 필요: python3 tools/build.py\n')
        print('PASS: index.html이 편집 원본과 일치합니다.')
    else:
        output.write_text(html, encoding='utf-8')
        print('완료: index.html (CSS·JavaScript 포함, 외부 파일 요청 없음)')
