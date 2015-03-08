# gulp-brass

[![Build Status](http://img.shields.io/travis/monai/gulp-brass/develop.svg)](https://travis-ci.org/monai/gulp-brass)
[![NPM Version](http://img.shields.io/npm/v/gulp-brass.svg)](https://www.npmjs.org/package/gulp-brass)

Build RPM package.

## Introduction

This is a wrapper around [`rpmbuild`](https://fedoraproject.org/wiki/How_to_create_an_RPM_package#The_basics_of_building_RPM_packages) command and SPEC file generator done in gulp way. It covers subset of RPM features required to package, deploy, and run application on (usually) server. That is, it's possible but not encouraged to to use gulp-brass as a tool to package software for publishing to end users. On the contrary, you should see gulp-brass as deployment tool for, but not limited to, your own applications.

gulp-brass follows gulp pattern `gulp.src(...)` -> `transform` -> `gulp.dest(...)`. From this pattern emerges core gulp-brass API design principle: sane defaults and extensibility over configuration. Following this, provided SPEC file and service file templates are and will be kept at bare minimum. If you want to extend them, you should copy and modify provided files or write your own from scratch and pass them to `gulp.src(...)`. Not so rare example cases would be adding pre/post install/uninstall hooks to SPEC file or using advanced systemd features.

## How to use

Below is API documentation but it's highly recommended look at [gulpfile.js example](/examples/theapp/gulpfile.js) to see how it may look as a whole.

## RPM

```js
var brass = require('gulp-brass');
```
### brass.create(options)

```js
var rpm = brass.create(options);
```

Options that represent SPEC file tags (see [more information](http://rpm.org/max-rpm-snapshot/s1-rpm-inside-tags.html)):

- `type` (default: `rpm`) - for now only RPM is supported.
- `name` - name of the software being packaged.
- `version` - version of the software being packaged.
- `license` - license of software being packaged.
- `summary` - one-line description of the packaged software.
- `description` - in-depth description of the packaged software.
- `release` (default: 1) -  package's version.
- `url` (optional) - URL that can be used to obtain additional information about the packaged software.

Other options:

- `prefix` (default: `/usr`, optional) - prefix where to install binaries. It's used by [gulp-brass-npm](https://github.com/monai/gulp-brass-npm/).

### rpm.options

An object that contains merged default option and options passed to `brass.create()`. It can be modified to adjust settings after `brass.create()` was called.

### rpm.globOptions

Returns an options object to be passed to `gulp.src(globs[, options])` when the sources of software being packaged are unpacked to [BUILD directory](#rpmbuilddir). It's value always is:

```js
{
  mark: true,
  cwd: rpm.buildDir_BUILD,
  base: rpm.buildDir_BUILD
}
```

### rpm.buildDir_*

`rpmbuild` uses five special purpose directories in which performs build: SOURCES, SPECS, BUILD, RPMS, SRPMS. See more information on [build directory structure](http://rpm.org/max-rpm-snapshot/ch-rpm-build.html).

- `SOURCES` is not used by gulp-brass.
- `SPECS` contains SPEC file. `rpm.specTask()` places SPEC file to this directory and `rpm.buildTask()` runs `rpmbuild` against that file. Customized SPEC file also should be placed to this directory.
- `BUILD` is the directory for unpacked sources and software building. Although it's not necessary to use this directory at all, but it's the place to build or put built software when using one build system for building software, and gulp only for packaging it to RPM.
- `RPMS` contains built RPM file.
- `RPMS` is not used by gulp-brass.

### rpm.setupTask()

Returns gulp task for `rpm.setup()`.

This task is recommended way to run setup since `rpm.setup()` doesn't return stream, hence there's nothing to customize.

### rpm.setup(callback)

Creates build directory (`./brass_build`) and directory structure required by `rpmbuild` in it. 

### rpm.files()

Returns transform stream which registers piped files to be listed in SPEC file. All packaged files must be piped to this stream. Always pipe after `gulp.dest()`.

### rpm.specTask()

Returns gulp task which renders default SPEC file template.

Use this task if you're not going to customize SPEC file.

### rpm.spec()

Returns transform stream which renders piped SPEC file template. Before rendering template it populates `rpm.options.specFileList` with `rpm.renderFileList()` output.

### rpm.buildTask()

Returns gulp task which runs `rpmbuild` against SPEC file.

This task is recommended way to run build since `rpm.build()` doesn't accept any customizations.

### rpm.build()

Returns transform stream which runs `rpmbuild` against piped SPEC files.

### rpm.renderFileList()

Returns registered files list with inlined attributes as string to be used in `%files` section in SPEC file. See section [vinyl extension](#vinyl-extensions).

## Utils

```js
var util = brass.util;
```

### util.assets(filename)

Returns path to internal [asset](/assets). Intended to use with `gulp.src()`.

### util.stream(callback)

Returns simplified [`through2.obj`](https://github.com/rvagg/through2) stream.

Callback arguments are `callback(file, callback)`.

### util.template(data)

Returns stream that renders piped vinyl objects as templates with provided `data`.
Uses [handlebars](https://www.npmjs.com/package/handlebars) template engine and [handlebars-helper-equal](https://www.npmjs.com/package/handlebars-helper-equal) helper.

### util.symlink(name, [options])

Returns stream that makes symlinks to `name` path like `$ ln -s target name`.
If name is an array, it iterates to next name with each file.

Options:

- `deep` - if `true`, makes symlink for each name to each piped file. This is convenient when you need to have few symlinks to same file.

## Vinyl extensions

`rpm.renderFileList()` uses some vinyl file object extensions:

- `file.attr` (`[ mode, user, group ]`) - sets file mode, user, and group, eg. `[ '0777', 'apache', 'apache' ]`.
- `file.config` (default: `false`) - sets if file is config file.
- `file.noreplace` (default: `false`) - sets config file upgrade policy.

More info on `config` and `noreplace` [prefixes](https://fedoraproject.org/wiki/How_to_create_an_RPM_package#.25files_prefixes).

## License

ISC
