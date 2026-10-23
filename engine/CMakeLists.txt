cmake_minimum_required(VERSION 3.10)
project(database_indexing_engine VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED OFF)

include_directories(include)

# Indexer Engine Executable
add_executable(indexer_engine
    src/main.cpp
)

# Engine Test Executable
add_executable(engine_tests
    tests/test_indexes.cpp
)

if (CMAKE_COMPILER_IS_GNUCXX)
    target_compile_options(indexer_engine PRIVATE -O3 -Wall -Wextra)
    target_compile_options(engine_tests PRIVATE -O3 -Wall -Wextra)
endif()
