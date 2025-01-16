#include <iostream>
#include <cstring>
#include <iomanip>
#include <unistd.h>
#include "fs.h"

FS::FS()
{
    std::cout << "FS::FS()... Creating file system\n";
}

FS::~FS()
{

}

// formats the disk, i.e., creates an empty file system
int
FS::format()
{
    std::cout << "FS::format()\n";

    std::memset(fat, FAT_FREE, sizeof(fat));
    fat[ROOT_BLOCK] = FAT_EOF;
    fat[FAT_BLOCK] = FAT_EOF;
    disk.write(FAT_BLOCK, (uint8_t*)fat);

    std::memset(current_direct, 0, sizeof(current_direct));
    disk.write(ROOT_BLOCK, (uint8_t*)current_direct);

    current_working_index = 0;
    root_parent_index[current_working_index] = 0;

    return 0;
}
bool FS::check_directory_access(dir_entry* dir, uint8_t required_rights) 
{
    return (dir->access_rights & required_rights) == required_rights;
}

// create <filepath> creates a new file on the disk, the data content is
// written on the following rows (ended with an empty row)
int
FS::create(std::string filepath)
{
    // Check the directory access rights; if it does not have write access, we cannot create a file
    // if (!check_directory_access(&current_direct[current_working_index], WRITE)) {
    // std::cout << "Error: Directory does not have write permission\n";
    // return -1;
// }
    if(filepath.size() >= 56){
        std::cout << "File name can not be over 55 char\n";
        return 0;
    }
    int8_t i;
    for (i = 0; i < DIR_NUMBERS; i++) {
        if (current_direct[i].file_name[0] == '\0') {
            break;
        }
    }


    if (static_cast<int>(i) == 64) {
        std::cout << "No space available\n";
        return 0;
    }

    int8_t j = filepath.find_last_of('/');
    std::string source_file = filepath.substr(j + 1, filepath.size() - j);

    std::string content;
    std::string line;
    while (std::getline(std::cin, line) && !line.empty()) {
        content += line + "\n";
    }
    
    

    int count_block_needed = content.size() / BLOCK_SIZE;
    int remainder = content.size() % BLOCK_SIZE;
    if (remainder > 0) {
        count_block_needed++;
    }
    int8_t first_blks[count_block_needed + 1] = {FAT_EOF};
    int free_block;
    for (int i = 0; i < count_block_needed; i++) {
        free_block = free_block_finder();
        if (free_block < 0)
            return 0;
        first_blks[i] = free_block;
        fat[free_block] = FAT_EOF;
        disk.write(FAT_BLOCK, (uint8_t*)fat);
        disk.write(free_block, (uint8_t*)content.substr(i * BLOCK_SIZE, BLOCK_SIZE).c_str());
    }
    
    for (int i = 0; i < count_block_needed; i++) {
        fat[first_blks[i]] = first_blks[i + 1];
    }
    fat[first_blks[count_block_needed-1]] = FAT_EOF;
    disk.write(FAT_BLOCK, (uint8_t*)fat);

    dir_entry new_file;
    std::strncpy(new_file.file_name, filepath.c_str(), sizeof(new_file.file_name) - 1);
    new_file.file_name[sizeof(new_file.file_name) - 1] = '\0'; // Ensure null-termination
    new_file.size = content.size();
    new_file.first_blk = first_blks[0];
    new_file.type = TYPE_FILE;
    new_file.access_rights = READ | WRITE;

    for (int i = 0; i < DIR_NUMBERS; i++) {
        if (current_direct[i].file_name[0] == '\0') {
            current_direct[i] = new_file;
            break;
        }else if (std::strcmp(current_direct[i].file_name, source_file.c_str()) == 0) {
            std::cout << source_file << " already exists\n";
            return 0;
        }
    }

    if (Current_working_dir == "/") {
        disk.write(ROOT_BLOCK, (uint8_t*)current_direct);
    }else{
        disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
    }

    return 0;
}


// cat <filepath> reads the content of a file and prints it on the screen
int
FS::cat(std::string filepath)
{
    // if (!check_directory_access(&current_direct[current_working_index], READ)) {
    //     std::cout << "Error: Directory does not have read permission\n";
    //     return -1;
    // }
    int8_t file_index = check_file(filepath, current_direct);
    if (file_index < 0) {
        std::cout << filepath << " not found\n";
        return 0;
    }

    if (current_direct[file_index].type != TYPE_FILE){
        std::cout << filepath << " is not a file" << std::endl;
        return 0;
    }

    int8_t right = static_cast<int>(current_direct[file_index].access_rights);
    if (right == 1 || right == 2 || right == 3) {
        std::cout << "Permission denied\n";
        return 0;
    }


    int block = current_direct[file_index].first_blk;
    while (block != FAT_EOF) {
        uint8_t buffer[BLOCK_SIZE+1];
        disk.read(block, buffer);
        buffer[BLOCK_SIZE] = '\0';  // Ensure null-termination
        std::cout << (char*)buffer;
        block = fat[block];
    }
    return 0;
}

// ls lists the content in the currect directory (files and sub-directories)
int
FS::ls()
{
    const std::string HEADER = "NAME        TYPE       ACCESRIGHTS     SIZE";
    const std::string SEPARATOR = "______________________________________________";
    
    std::cout << HEADER << "\n";
    std::cout << SEPARATOR << "\n";
    
    for (unsigned int i = 0; i < DIR_NUMBERS; ++i) {
        const dir_entry& entry = current_direct[i];
        
        if (entry.file_name[0] != '\0') {
            const int name_length = std::strlen(entry.file_name);
            const bool is_directory = entry.type == TYPE_DIR;
            
            // Print filename with padding
            std::cout << entry.file_name << std::setw(16-name_length);
            
            // Print type
            std::cout << (is_directory ? "dir" : "file") << "\t";
            
            // Print access rights
            std::cout << "  "
                     << ((entry.access_rights & READ) ? "r" : "-")
                     << ((entry.access_rights & WRITE) ? "w" : "-")
                     << ((entry.access_rights & EXECUTE) ? "x" : "-") 
                     << "\t";
            
            // Print size
            std::cout << "         " 
                     << (is_directory ? "-" : std::to_string(entry.size))
                     << "\n";
        }
    }
    return 0;
}

// cp <sourcepath> <destpath> makes an exact copy of the file
// <sourcepath> to a new file <destpath>
int
FS::cp(std::string sourcepath, std::string destpath)
{
    dir_entry temp_dir[DIR_NUMBERS];
    std::memcpy(temp_dir, current_direct, sizeof(current_direct));
    int8_t temp_index = current_working_index;

    int i = sourcepath.size() - 1; 
    while (sourcepath[i] != '/' && i > 0) {
        i--;
    }
    std::string source_file;
    dir_entry source_file_copy;
    int8_t source_file_index;
    source_file_index = -1;
    if (i == 0) {
        if (sourcepath[0] == '/') {
            source_file = sourcepath.substr(1, sourcepath.size() - 1);
            sourcepath = "/";
        }else{
            source_file = sourcepath;
            source_file_index = check_file(sourcepath, current_direct);
            source_file_copy = current_direct[source_file_index];
        }
    }else{
        source_file = sourcepath.substr(i + 1, sourcepath.size() - i);
        sourcepath = sourcepath.substr(0, i);
    }

    int8_t dest_file_index;
    dest_file_index = -2;
    int8_t j = destpath.size() - 1; 
    while (destpath[j] != '/' && j > 0) {
        j--;
    }
    std::string dest_file;
    dest_file = "";
    dir_entry dest_direct[DIR_NUMBERS];
    int8_t dest_dir_index = root_parent_index[current_working_index];
    if (j == 0) {
        if (destpath[0] == '/') {
            // dest_file = destpath.substr(1, destpath.size() - 1);
            // destpath = "/";
        }else{
            dest_file = source_file;
            dest_file_index = check_file(destpath, current_direct);
            if (dest_file_index >= 0) {
                if (current_direct[dest_file_index].type == TYPE_DIR){
                    dest_file_index = -2;
                }else{
                    std::cout << destpath << " already exists\n";
                    return 0;
                }
            }
            std::memcpy(dest_direct, current_direct, sizeof(current_direct));
        }
    }else{
        dest_file = destpath.substr(j + 1, destpath.size() - j);
        destpath = destpath.substr(0, j);
    }

    // check if the source file and destination file is in the same directory
    if (source_file_index >= 0 && dest_file_index >= 0){
        for (int i = 0; i < DIR_NUMBERS; i++) {
            if (current_direct[i].file_name[0] == '\0') {
                current_direct[i] = source_file_copy;
                std::strncpy(current_direct[i].file_name, dest_file.c_str(), sizeof(current_direct[i].file_name) - 1);
                current_direct[i].file_name[sizeof(current_direct[i].file_name) - 1] = '\0'; // Ensure null-termination
                disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
                return 0;
            }
        }
    }

    std::string tempcwd = Current_working_dir;
    int8_t temp_root_parent_index[64];
    std::memcpy(temp_root_parent_index, root_parent_index, sizeof(root_parent_index));

    int8_t res;
    if (source_file_index < 0) {
        res = set_current_to(sourcepath);
        if (res < 0) {
            return 0;
        }
        source_file_index = check_file(source_file, current_direct);
        if (source_file_index < 0) {
            std::cout << source_file << " not found\n";
            return 0;
        }
        source_file_copy = current_direct[source_file_index];
    }
    // if we found source file
    if (source_file_index >= 0 && dest_file_index >= 0){
        for (int i = 0; i < DIR_NUMBERS; i++) {
            if (dest_direct[i].file_name[0] == '\0') {
                dest_direct[i] = source_file_copy;
                std::strncpy(dest_direct[i].file_name, dest_file.c_str(), sizeof(dest_direct[i].file_name) - 1);
                dest_direct[i].file_name[sizeof(dest_direct[i].file_name) - 1] = '\0'; // Ensure null-termination
                disk.write(dest_dir_index, (uint8_t*)dest_direct);
                
                Current_working_dir = tempcwd;
                current_working_index = temp_index;
                disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
                return 0;
            }
        }
    }

    current_working_index = temp_index;   // restore current index for destination
    std::memcpy(current_direct, temp_dir, sizeof(current_direct));
    res = set_current_to(destpath);
    if (res < 0) {
        for (int i = 0; i < DIR_NUMBERS; i++) {
            if (current_direct[i].file_name[0] == '\0') {
                current_direct[i] = source_file_copy;
                std::strncpy(current_direct[source_file_index].file_name, destpath.c_str(), sizeof(current_direct[source_file_index].file_name) - 1);
                current_direct[source_file_index].file_name[sizeof(current_direct[source_file_index].file_name) - 1] = '\0'; // Ensure null-termination
                disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
                Current_working_dir = tempcwd;
                current_working_index = temp_index;
                disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
                return 0;
            }
        }
    }
    j = destpath.find_last_of('/');
    dest_file = destpath.substr(j + 1, destpath.size() - j);
    dest_file_index = check_file(dest_file, current_direct);
    if (dest_file_index >= 0 && current_direct[dest_file_index].type == TYPE_FILE) {
        std::cout << dest_file_index << " already exists\n";
        return 0;
    }

    for (int i = 0; i < DIR_NUMBERS; i++) {
        if (current_direct[i].file_name[0] == '\0') {
            current_direct[i] = source_file_copy;
            disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
            break;
        }
    }

    Current_working_dir = tempcwd;
    current_working_index = temp_index;
    std::memcpy(root_parent_index, temp_root_parent_index, sizeof(root_parent_index));
    disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
    return 0;
}

// mv <sourcepath> <destpath> renames the file <sourcepath> to the name <destpath>,
// or moves the file <sourcepath> to the directory <destpath> (if dest is a directory)
int
FS::mv(std::string sourcepath, std::string destpath)
{   
    dir_entry temp_dir[DIR_NUMBERS];
    std::memcpy(temp_dir, current_direct, sizeof(current_direct));
    int8_t temp_index = current_working_index;

    int i = sourcepath.size() - 1; 
    while (sourcepath[i] != '/' && i > 0) {
        i--;
    }
    std::string source_file;
    dir_entry source_file_copy;
    int8_t source_file_index;
    source_file_index = -1;
    if (i == 0) {
        if (sourcepath[0] == '/') {
            source_file = sourcepath.substr(1, sourcepath.size() - 1);
            sourcepath = "/";
        }else{
            source_file = sourcepath;
            source_file_index = check_file(sourcepath, current_direct);
            if (source_file_index <0) {
                std::cout << source_file << " not found\n";
                return 0;
            }
        
            source_file_copy = current_direct[source_file_index];
        }
    }else{
        source_file = sourcepath.substr(i + 1, sourcepath.size() - i);
        sourcepath = sourcepath.substr(0, i);
    }

    std::string tempcwd = Current_working_dir;
    int8_t temp_root_parent_index[64];
    std::memcpy(temp_root_parent_index, root_parent_index, sizeof(root_parent_index));

    int8_t res;
    if (source_file_index < 0) {
        res = set_current_to(sourcepath);
        if (res < 0) {
            return 0;
        }
        source_file_index = check_file(source_file, current_direct);
        if (source_file_index < 0) {
            std::cout << source_file << " not found\n";
            return 0;
        }
        source_file_copy = current_direct[source_file_index];
    }

    dir_entry source_direct[DIR_NUMBERS];
    std::memcpy(source_direct, current_direct, sizeof(current_direct));
    int source_root_parent_index = root_parent_index[current_working_index];

    current_working_index = temp_index;   // restore current index for destination
    std::memcpy(current_direct, temp_dir, sizeof(current_direct));
    std::memcpy(root_parent_index, temp_root_parent_index, sizeof(root_parent_index));

    // destpath
    
    i = destpath.find_last_of('/');
    std::string dest_file;
    if (i >= 0){
        if (destpath[0] != '/') {
            dest_file = destpath.substr(i + 1, destpath.size() - i);
            destpath = destpath.substr(0, i);
        }
    }else{
        dest_file = destpath;
    }

    if (dest_file != "") {
        int8_t dest_file_index = check_file(dest_file, current_direct);
        if (dest_file_index >= 0) {
            if (current_direct[dest_file_index].type == TYPE_FILE) {
                std::cout << dest_file << " already exists\n";
                return 0;
            }
        }
    }

    if (destpath != "") {
        res = set_current_to(destpath);
        if (res < 0) {
            std::strncpy(current_direct[source_file_index].file_name, dest_file.c_str(), sizeof(current_direct[source_file_index].file_name) - 1);
            current_direct[source_file_index].file_name[sizeof(current_direct[source_file_index].file_name) - 1] = '\0'; // Ensure null-termination
            disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
            Current_working_dir = tempcwd;
            current_working_index = temp_index;
            disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
            return 0;
        }else{
            for (int i = 0; i < DIR_NUMBERS; i++) {
                if (current_direct[i].file_name[0] == '\0') {
                    current_direct[i] = source_file_copy;
                    disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
                    break;
                }else if (std::strcmp(current_direct[i].file_name, dest_file.c_str()) == 0 && current_direct[i].type == TYPE_FILE) {
                    std::cout << dest_file << " already exists\n";
                    return 0;
                }
            }

        }
    }


    std::memset(&source_direct[source_file_index], 0, sizeof(dir_entry));
    disk.write(source_root_parent_index, (uint8_t*)source_direct);

    Current_working_dir = tempcwd;
    current_working_index = temp_index;
    std::memcpy(root_parent_index, temp_root_parent_index, sizeof(root_parent_index));
    disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
    return 0;
}

int
FS::rm(std::string filepath)
{
    int8_t file_index = check_file(filepath, current_direct);
    if (file_index < 0) {
        std::cout << filepath << " not found\n";
        return 0;
    }

    // int8_t count = 0;
    // if (current_direct[file_index].type != TYPE_FILE){
    //     for (int i = 0; i < DIR_NUMBERS; i++) {
    //         if (current_direct[i].file_name[0] == '\0') {
    //             break;
    //         }
    //         count += 1;
    //     }
    // }

    // if (count > 0){
    //     std::cout << filepath << " is not empty\n";
    //     return 0;
    // }

    int block = current_direct[file_index].first_blk;
    while (block != FAT_EOF) {
        block = fat[block];
        fat[block] = FAT_FREE;
    }

    disk.write(FAT_BLOCK, (uint8_t*)fat);
    std::memset(&current_direct[file_index], 0, sizeof(dir_entry));
    disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
    return 0;
}

// append <filepath1> <filepath2> appends the contents of file <filepath1> to
// the end of file <filepath2>. The file <filepath1> is unchanged.
int
FS::append(std::string filepath1, std::string filepath2)
{
    if (filepath1 == filepath2) {
        return 0;
    }

    dir_entry temp_dir[DIR_NUMBERS];
    std::memcpy(temp_dir, current_direct, sizeof(current_direct));
    int8_t temp_index = current_working_index;

    int i = filepath1.size() - 1; 
    while (filepath1[i] != '/' && i > 0) {
        i--;
    }
    std::string source_file;
    dir_entry source_file_copy;
    source_file_copy.file_name[0] = '\0';
    int8_t source_file_index;
    if (i == 0) {
        if (filepath1[0] == '/') {
            source_file = filepath1.substr(1, filepath1.size() - 1);
            filepath1 = "/";
        }else{
            source_file = filepath1;
            source_file_index = check_file(filepath1, current_direct);
            source_file_copy = current_direct[source_file_index];
        }
    }else{
        source_file = filepath1.substr(i + 1, filepath1.size() - i);
        filepath1 = filepath1.substr(0, i);
    }

    int8_t dest_file_index = -1;
    int8_t j = filepath2.size() - 1; 
    while (filepath2[j] != '/' && j > 0) {
        j--;
    }
    std::string dest_file;
    if (j == 0) {
        if (filepath2[0] == '/') {
            dest_file = filepath2.substr(1, filepath2.size() - 1);
            filepath2 = "/";
        }else{
            dest_file_index = check_file(filepath2, current_direct);
        }
    }else{
        dest_file = filepath2.substr(j + 1, filepath2.size() - j);
        filepath2 = filepath2.substr(0, j);
    }

    // check if the source file and destination file is in the same directory
    if (source_file_copy.file_name[0] != '\0' && dest_file_index >= 0){
        int8_t right = static_cast<int>(current_direct[dest_file_index].access_rights);
        if (right == 1 || right == 4 || right == 5) {
            std::cout << "Permission denied\n";
            return 0;
        }
        int block = current_direct[dest_file_index].first_blk;
        while (fat[block] != FAT_EOF) {
            block = fat[block];
        }
        fat[block] = source_file_copy.first_blk;
        current_direct[dest_file_index].size += source_file_copy.size;
        disk.write(FAT_BLOCK, (uint8_t*)fat);
        disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
        return 0;
    }

    std::string tempcwd = Current_working_dir;
    int8_t temp_root_parent_index[64];
    std::memcpy(temp_root_parent_index, root_parent_index, sizeof(root_parent_index));

    int8_t res;
    if (source_file_copy.file_name[0] == '\0') {
        res = cd(filepath1);
        if (res < 0) {
            return 0;
        }
        source_file_index = check_file(source_file, current_direct);
        if (source_file_index < 0) {
            std::cout << source_file << " not found\n";
            return 0;
        }
        source_file_copy = current_direct[source_file_index];
    }
    // if we found source file
    if (source_file_copy.file_name[0] != '\0' && dest_file_index >= 0){
        int8_t right = static_cast<int>(current_direct[dest_file_index].access_rights);
        if (right == 1 || right == 4 || right == 5) {
            std::cout << "Permission denied\n";
            Current_working_dir = tempcwd;
            current_working_index = temp_index;
            disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
            return 0;
        }
        int block = temp_dir[dest_file_index].first_blk;
        while (fat[block] != FAT_EOF) {
            std::cout << "block: " << block << "\n";
            block = fat[block];
        }

        fat[block] = source_file_copy.first_blk;
        temp_dir[dest_file_index].size += source_file_copy.size;
        disk.write(FAT_BLOCK, (uint8_t*)fat);
        disk.write(root_parent_index[temp_index], (uint8_t*)temp_dir);

        std::memset(&current_direct[source_file_index], 0, sizeof(dir_entry));
        Current_working_dir = tempcwd;
        current_working_index = temp_index;
        disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
        return 0;
    }

    dir_entry copy_source_dir[DIR_NUMBERS];
    std::memcpy(copy_source_dir, current_direct, sizeof(current_direct));
    int source_root_parent_index = root_parent_index[current_working_index];

    current_working_index = temp_index;   // restore current index for destination
    std::memcpy(current_direct, temp_dir, sizeof(current_direct));

    res = cd(filepath2);
    if (res < 0) {
        return 0;
    }
    dest_file_index = check_file(dest_file, current_direct);
    if (dest_file_index < 0) {
        std::cout << dest_file << " not found\n";
        return 0;
    }
    
    int8_t right = static_cast<int>(current_direct[dest_file_index].access_rights);
    if (right == 1 || right == 4 || right == 5) {
        std::cout << "Permission denied\n";
        return 0;
    }
    
    int block = current_direct[dest_file_index].first_blk;
    while (fat[block] != FAT_EOF) {
        block = fat[block];
    }

    fat[block] = source_file_copy.first_blk;
    current_direct[dest_file_index].size += source_file_copy.size;
    disk.write(FAT_BLOCK, (uint8_t*)fat);
    disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
    std::memset(&copy_source_dir[source_file_index], 0, sizeof(dir_entry));
    disk.write(source_root_parent_index, (uint8_t*)copy_source_dir);

    Current_working_dir = tempcwd;
    current_working_index = temp_index;
    disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
    return 0;
}

// mkdir <dirpath> creates a new sub-directory with the name <dirpath>
// in the current directory
int
FS::mkdir(std::string dirpath)
{
    std::string tempcwd = Current_working_dir;
    int8_t temp_root_parent_index[64];
    std::memcpy(temp_root_parent_index, root_parent_index, sizeof(root_parent_index));
    int8_t temp_index = current_working_index;

    int8_t size = dirpath.size() - 1;
    int8_t j = 0;
    std::string dirname;
    for (int i = 0; i < size; i++) {
        if (dirpath[i] == '/' || i == size - 1) {
            dirname = dirpath.substr(j, i - j);
            if (i == size - 1) {
                dirname = dirpath.substr(j, size - j + 1);
            }
            j = i + 1;
            if(dirname.size() > 55){
                std::cout << "Directory name longer then 55 char\n";
                return 0;
            }

            int8_t file_index = check_file(dirname, current_direct);
            if (file_index >= 0 || dirname == "..") {
                set_current_to(dirname);
            }else{
                int free_block = free_block_finder();
                if (free_block < 0) {
                    return 0;
                }

                fat[free_block] = FAT_EOF;
                disk.write(FAT_BLOCK, (uint8_t*)fat);

                dir_entry folder;
                std::strncpy(folder.file_name, dirname.c_str(), sizeof(folder.file_name) - 1);
                folder.file_name[sizeof(folder.file_name) - 1] = '\0'; // Ensure null-termination
                folder.size = 0;
                folder.first_blk = free_block;
                folder.type = TYPE_DIR;
                folder.access_rights = READ | WRITE | EXECUTE;

                for (int i = 0; i < DIR_NUMBERS; i++) {
                    if (current_direct[i].file_name[0] == '\0') {
                        current_direct[i] = folder;
                        break;
                    }else if (std::strcmp(current_direct[i].file_name, dirname.c_str()) == 0) {
                        std::cout << dirname << " already exists\n";
                        return 0;
                    }
                }

                // write the new directory to parent directory
                if (Current_working_dir == "/") {
                    disk.write(ROOT_BLOCK, (uint8_t*)current_direct);
                }else{
                    disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
                }

                // create a new directory with no files
                dir_entry new_direct[DIR_NUMBERS];
                std::memset(new_direct, 0, sizeof(new_direct));
                disk.write(free_block, (uint8_t*)new_direct);

                set_current_to(dirname);
            }    
        }
    }
    Current_working_dir = tempcwd;
    current_working_index = temp_index;
    std::memcpy(root_parent_index, temp_root_parent_index, sizeof(root_parent_index));
    disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
    return 0;
}

// cd <dirpath> changes the current (working) directory to the directory named <dirpath>
int
FS::cd(std::string dirpath)
{   
    dir_entry temp_dir[DIR_NUMBERS];
    std::memcpy(temp_dir, current_direct, sizeof(current_direct));
    std::string tempcwd = Current_working_dir;
    int8_t temproot_parent_index[64];
    int8_t temp_index = current_working_index;
    std::memcpy(temproot_parent_index, root_parent_index, sizeof(root_parent_index));
    int8_t res = set_current_to(dirpath);
    if (res < 0) {
        current_working_index = temp_index;
        std::memcpy(current_direct, temp_dir, sizeof(current_direct));
        root_parent_index[current_working_index] = temproot_parent_index[current_working_index];
        Current_working_dir = tempcwd;

        if (res == -2)
        {
            std::cout << dirpath << " is not a directory\n";
        }else{
            std::cout << dirpath << " not found\n";
        }
        return 0;
    }
    return 0;
}

// pwd prints the full path, i.e., from the root directory, to the current
// directory, including the currect directory name
int
FS::pwd()
{
    if (Current_working_dir.empty()) {
        std::cout << "/\n";
    } else {
        std::cout << Current_working_dir << "\n";
    }
    return 0;
}
// chmod <accessrights> <filepath> changes the access rights for the
// file <filepath> to <accessrights>.
int
FS::chmod(std::string accessrights, std::string filepath)
{
    int8_t file_index = check_file(filepath, current_direct);
    if (file_index < 0) {
        std::cout << filepath << " not found\n";
        return 0;
    }

    dir_entry *file = &current_direct[file_index];
    int access = std::stoi(accessrights);

    if (access == 0) {
        file->access_rights = 0x00;
    }
    else if (access == 1) {
        file->access_rights = EXECUTE;
    }
    else if (access == 2) {
        file->access_rights = WRITE;
    }
    else if (access == 3) {
        file->access_rights = WRITE | EXECUTE;
    }
    else if (access == 4) {
        file->access_rights = READ;
    }
    else if (access == 5) {
        file->access_rights = READ | EXECUTE;
    }
    disk.write(root_parent_index[current_working_index], (uint8_t*)current_direct);
    return 0;
}


// find a free block in the FAT
int
FS::free_block_finder()
{
    int starting=2;
    for (int i = starting; i < disk.get_no_blocks(); i++) {
        if (fat[i] == FAT_FREE) {
            return i;
        }
    }
    std::cout << " We dont have available\n";
    return -1;
}

// find a file in the root directory
int
FS::check_file(std::string filepath, dir_entry *entry)
{
    for (int i = 0; i < DIR_NUMBERS; i++) {
        if (std::strcmp(entry[i].file_name, filepath.c_str()) == 0) {
            return i;
        }
    }
    return -1;
}

int
FS::set_current_to(std::string dirpath)
{
    int8_t j = 1;
    int8_t i = 1;

    if (dirpath[0] == '/') {
        Current_working_dir = "/";
        current_working_index = 0;
        disk.read(ROOT_BLOCK, (uint8_t*)current_direct);
        if (dirpath == "/") {
            return 0;
        }
        for (j = 1; j <= dirpath.size(); j++) {
            std::string sub = "";
            if (dirpath[j] == '/')
                sub = dirpath.substr(i, j-i);

            else if (dirpath[j] == '\0')
                sub = dirpath.substr(i, j-i);

            if (sub != "") {
                i = j + 1;
                int8_t dir_index = check_file(sub, current_direct);
                if (dir_index < 0)
                    return -1;
                
                if (current_direct[dir_index].type != TYPE_DIR)
                    return -2;

                current_working_index++;
                root_parent_index[current_working_index] = current_direct[dir_index].first_blk;
                disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
                if (Current_working_dir == "/")
                    Current_working_dir += sub;
                else
                    Current_working_dir += '/' + sub;
            }
        }
    }else{
        i = 0;
        for (j = 0; j <= dirpath.size(); j++) {
            std::string sub = "";
            if (dirpath[j] == '/')
                sub = dirpath.substr(i, j-i);
            else if (dirpath[j] == '\0')
                sub = dirpath.substr(i, j-i);
            
            if (sub != "") {
                i = j + 1;
                if (sub == "..") {
                    if (Current_working_dir == "/")
                        return 0;
                    

                 

                    Current_working_dir = Current_working_dir.substr(0, Current_working_dir.find_last_of('/'));
                    current_working_index--;
                    disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
                }else{
                    int8_t dir_index = check_file(sub, current_direct);
                    if (current_direct[dir_index].type != TYPE_DIR)
                        return -2;
                    
                    if (dir_index < 0)
                        return -1;
                    
                    if (current_direct[dir_index].type != TYPE_DIR)
                        return -2;
                    
                    current_working_index++;
                    root_parent_index[current_working_index] = current_direct[dir_index].first_blk;
                    disk.read(root_parent_index[current_working_index], (uint8_t*)current_direct);
                    if (Current_working_dir == "/")
                        Current_working_dir += sub;
                    else
                        Current_working_dir += '/' + sub;
                    }
            }
        }
    }
    return 0;

}