SRC_DIR := src
TEST_DIR := test
OBJ_DIR := obj
DIST_DIR := dist

BUILD_PROPERTIES_FILE := build.properties

PREAMBLE_SRC := ${SRC_DIR}/preamble.js.template
SRC := ${SRC_DIR}/cartoon.js ${PREAMBLE_SRC}

REL_VERSION := $(shell grep -i '^\s*release\.version\s*=' ${BUILD_PROPERTIES_FILE} | head -n 1 | sed 's/.*=\s*//' )
##REL_DATE := $(shell git log -1 --pretty=format:%ad)	# <-- jquery does it so
REL_DATE := $(shell git show v${REL_VERSION} | grep -m 1 '^Date:' | sed 's/[^:]*:\s*//')

# output filenames of development and production (minified) versions
CARTOON := ${DIST_DIR}/jquery.cartoon-${REL_VERSION}.js
CARTOON_MIN := ${DIST_DIR}/jquery.cartoon-${REL_VERSION}.min.js

# names of intermediate files
PREAMBLE := ${OBJ_DIR}/preamble.tmp

release: ${CARTOON} ${CARTOON_MIN}


info:
	@echo REL_DATE = ${REL_DATE}
	@echo REL_VERSION = ${REL_VERSION}
	@echo CARTOON = ${CARTOON}
	@echo CARTOON_MIN = ${CARTOON_MIN}
	@echo PREAMBLE = ${PREAMBLE}



${CARTOON}: $(SRC) ${PREAMBLE} | ${OBJ_DIR} ${DIST_DIR}
	cp -f ${SRC_DIR}/cartoon.js ${OBJ_DIR}/cartoon.tmp
	cat ${PREAMBLE} ${OBJ_DIR}/cartoon.tmp > ${CARTOON}


${CARTOON_MIN}: $(SRC) ${PREAMBLE} | ${OBJ_DIR} ${DIST_DIR}
	@echo "Minifying ..."
	curl --data-urlencode "js_code@${SRC_DIR}/cartoon.js" -d compilation_level=SIMPLE_OPTIMIZATIONS -d output_info=compiled_code -d output_format=text http://closure-compiler.appspot.com/compile > ${OBJ_DIR}/cartoon.min.tmp

	cat ${PREAMBLE} ${OBJ_DIR}/cartoon.min.tmp > ${CARTOON_MIN}


${PREAMBLE}: ${PREAMBLE_SRC} | ${OBJ_DIR}
	cat ${PREAMBLE_SRC} | \
		sed "s/@REL_DATE@/${REL_DATE}/" | \
		sed "s/@REL_VERSION@/${REL_VERSION}/" > ${PREAMBLE}

preamble: ${PREAMBLE}


${OBJ_DIR}:
	mkdir -p ${OBJ_DIR}

${DIST_DIR}:
	mkdir -p ${DIST_DIR}


clean:
	rm -rf ${OBJ_DIR} ${DIST_DIR}


##version:
##ifeq ("${VERSION}", "")
##	@echo Provide new version number as argument to make, as in \'make VERSION=0.5.0 version\'
##else
##	# TODO: sanity checks (acceptable format, not yet existing)
##	echo ${VERSION} > VERSION
##	git commit -m 'update version number to ${VERSION}'
##	git tag -a -m 'version ${VERSION}' v${VERSION}
##endif


.PHONY: clean version
