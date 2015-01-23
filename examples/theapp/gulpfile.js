var gulp = require('gulp');
var path = require('path');
var exec = require('child_process').exec;
var async = require('async');
var rimraf = require('rimraf');
var brass = require('../../index');

var options = {
    type: 'rpm',
    workDir: '.',
    name: 'theapp',
    version: '0.0.0',
    license: 'ISC',
    summary: 'The App',
    description: 'This is the application'
};

options.service = {
    type: 'systemd',
    name: options.name,
    description: options.description,
    exec: '/usr/bin/theapp',
    user: 'vagrant',
    group: 'vagrant'
};

var rpm = brass.create(options);

gulp.task('clean', function () {
    return gulp.src(rpm.buildDir, { read: false })
    .pipe(brass.util.stream(function (file, callback) {
        this.push(file);
        rimraf(file.path, callback);
    }));
});

gulp.task('rpm-setup', [ 'clean' ], rpm.setupTask());

gulp.task('npm-pack', [ 'rpm-setup' ], function (callback) {
    async.series([
        function (callback) {
            exec('npm pack', callback);
        }, function (callback) {
            var archive;
            
            archive = options.name +'-'+ options.version +'.tgz';
            archive = path.resolve(rpm.buildDir_SOURCES, path.join(process.cwd(), archive));
            
            exec('tar xvzf '+ archive, { cwd: rpm.buildDir_BUILD }, callback);
        }, function (callback) {
            process.env['NODE_ENV'] = 'production';
            exec('npm install', {
                env: process.env,
                cwd: path.join(rpm.buildDir_BUILD, 'package')
            }, callback);
        }
    ], callback);
});

gulp.task('rpm-files', [ 'rpm-setup', 'npm-pack' ], function () {
    var sources = path.relative(process.cwd(), rpm.buildDir_BUILD);
    return gulp.src([
        sources +'/package/*',
        sources +'/package/bin/**/*',
        sources +'/package/assets/**/*',
        sources +'/package/node_modules/**/*',
        '!'+ sources +'/package/config',
        '!'+ sources +'/package/var',
    ], { mark: true, base: sources +'/package' })
    .pipe(gulp.dest(path.join(rpm.buildRoot, '/usr/lib/theapp')))
    .pipe(rpm.files());
});

gulp.task('rpm-service', [ 'rpm-setup' ], function () {
    return gulp.src(brass.util.assets('service/systemd'))
    .pipe(brass.util.template(options.service))
    .pipe(brass.util.rename(options.service.name +'.service'))
    .pipe(gulp.dest(path.join(rpm.buildRoot, '/lib/systemd/system')))
    .pipe(rpm.files());
});

gulp.task('rpm-binaries', [ 'rpm-files' ], function () {
    return gulp.src(path.join(rpm.buildRoot, '/usr/lib/theapp/bin/theapp'))
    .pipe(brass.util.symlink([
        path.join(rpm.buildRoot, '/usr/sbin/theapp')
    ]))
    .pipe(rpm.files());
});

// gulp.task('rpm-spec', [ 'rpm-files' ], function () {
//     return gulp.src(brass.util.assets('rpm/spec'))
//     .pipe(rpm.spec())
//     .pipe(gulp.dest(rpm.buildDir_SPECS));
// });

gulp.task('rpm-spec', [ 'rpm-files', 'rpm-binaries' ], rpm.specTask());
 
// gulp.task('rpm-build', [ 'rpm-setup', 'rpm-files', 'rpm-spec' ], function () {
//     return gulp.src(path.join(rpm.buildDir_SPECS, '*'), { read: false })
//     .pipe(rpm.build());
// });

gulp.task('rpm-build', [ 'rpm-setup', 'npm-pack', 'rpm-files', 'rpm-binaries', 'rpm-service', 'rpm-spec' ], rpm.buildTask());

gulp.task('build', [ 'rpm-build' ], function () {
    console.log('build finished');
});

gulp.task('default', [ 'build' ]);
