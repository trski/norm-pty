import subprocess as sp
import os


def local(cmd):
    res = sp.call(cmd, shell=True)
    return res


def get_cwd():
    p = os.path.realpath(__file__)
    return p


def concat_files(src, dest):
    n = 0
    try:
        os.makedirs(os.path.dirname(dest))
    except OSError:
        pass
    with open(dest, "wb+") as outfile:
        for f in src:
            n += 1
            with open(f, "rb+") as infile:
                outfile.write(b'\n')
                outfile.write(infile.read())
    return n


def concat_css():
    fnames = [
        '../node_modules/bootstrap/dist/css/bootstrap.min.css',
        '../node_modules/xterm/dist/xterm.css',
        './src/css/custom.css',
    ]
    dest = './dist/css/main.css'
    res = concat_files(fnames, dest)
    print(res)


def concat_js():
    fnames = [
        '../node_modules/lodash/lodash.min.js',
        '../node_modules/jquery/dist/jquery.js',
        '../node_modules/popper.js/dist/umd/popper.min.js',
        '../node_modules/bootstrap/dist/js/bootstrap.min.js',
        '../node_modules/vue/dist/vue.min.js',
        '../node_modules/xterm/dist/xterm.js',
        '../node_modules/xterm/dist/addons/fit/fit.js',
        './src/js/reconnecting-websocket.min.js',
        './src/js/bootstrap-notify.min.js',
    ]
    dest = './dist/js/main.js'
    res = concat_files(fnames, dest)
    print(res)


def create_dirs():
    local('mkdir -p ./dist/img')
    local('mkdir -p ./dist/fonts')
    local('mkdir -p ./dist/webfonts')


def copy_images():
    local('cp -r ./src/img/*.* ./dist/img/')


def copy_fa_fonts():
    local(
        'cp -r src/fonts/fontawesome-free-5.7.0-web/webfonts/*'
        '\t'
        './dist/webfonts/'
    )


def copy_favicon():
    local('cp favicon.ico ./dist')


def copy_login():
    local('cp ./src/login.js ./dist/js/')


def copy_app():
    local('cp ./src/js/app.js ./dist/js/')


def build():
    concat_css()
    concat_js()
    create_dirs()
    # copy_images()
    # copy_fa_fonts()
    # copy_favicon()
    # copy_login()
    copy_app()


if __name__ == '__main__':
    build()
